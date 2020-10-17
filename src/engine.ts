#!/usr/bin/env node
import Loggers from './logger';
import BaseProvider from './kubernetes/providers/baseProvider';
import CooldownTracker from './cooldownTracker';
import DummyProvider from './kubernetes/providers/dummyProvider';
import KindProvider from './kubernetes/providers/kindProvider';
import GCPProvider from './kubernetes/providers/gcpProvider';
import RPCChild from "./communication/rpcChild";
import withTimeout from './helpers'
import WorkflowTracker from './workflow/tracker';
import logger from './logger';
import Workflow from './workflow/workflow';

const REACT_INTERVAL = 10000;
const SCALE_UP_UTILIZATION = 0.9;
const SCALE_DOWN_UTILIZATION = 0.5;

const SCALE_UP_COOLDOWN_S = 3 * 60;
const SCALE_DOWN_COOLDOWN_S = 3 * 60;

class Engine {

  private provider: BaseProvider;
  private rpc: RPCChild;
  private scaleUpCooldown: CooldownTracker;
  private scaleDownCooldown: CooldownTracker;
  private workflow: Workflow;
  private workflowTracker: WorkflowTracker;

  constructor(providerName: string) {
    Loggers.base.info("[Engine] Trying to create provider " + providerName);
    if (providerName == "gcp") {
      this.provider = new GCPProvider();
    } else if (providerName == "kind") {
      this.provider = new KindProvider();
    } else if (providerName == "dummy") {
      this.provider = new DummyProvider();
    }
    if (this.provider === undefined) {
      throw Error("Provider " + providerName + " not found!");
    }
    this.scaleUpCooldown = new CooldownTracker();
    this.scaleDownCooldown = new CooldownTracker();
    this.rpc = new RPCChild(this);
  }

  public async run(): Promise<void> {
    this.rpc.init();
    //this.rpc.call('addNumbers', [21, 15], (data) => { console.log('Got RPC response:', data); });
    //let sum = await this.rpc.callAsync('addNumbers', [21, 15]);
    await this.provider.initialize();

    this.reactLoop();
  }

  private async reactLoop(): Promise<void | Error> {
    Loggers.base.verbose("[Engine] React loop started");
    await this.provider.updateClusterState();
    Loggers.base.verbose("[Engine] Cluster state updated");

    let numWorkers = this.provider.getNumNodeWorkers();
    if (numWorkers instanceof Error) {
      return Error("Unable to get number of workers: " + numWorkers.message);
    }
    let supply = this.provider.getSupply();
    let demand = this.provider.getDemand();

    Loggers.base.verbose('[Engine] Number of HyperFlow workers: ' + numWorkers);
    Loggers.base.verbose('[Engine] Demand: ' + demand);
    Loggers.base.verbose('[Engine] Supply: ' + supply);

    if ((demand[0] / supply[0]) > SCALE_UP_UTILIZATION) {
      if (this.scaleUpCooldown.isExpired() === false) {
        Loggers.base.info("[Engine] Not enough CPU - not scaling due to up-cooldown");
      } else {
        Loggers.base.info("[Engine] Scaling up - not enough CPU");
        this.provider.resizeCluster(numWorkers + 1);
        this.scaleUpCooldown.setNSeconds(SCALE_UP_COOLDOWN_S);
      }
    } else if ((demand[1] / supply[1]) > SCALE_UP_UTILIZATION) {
      if (this.scaleUpCooldown.isExpired() === false) {
        Loggers.base.info("[Engine] Not enough RAM - not scaling due to up-cooldown");
      } else {
        Loggers.base.info("[Engine] Scaling up - not enough RAM");
        this.provider.resizeCluster(numWorkers + 1);
        this.scaleUpCooldown.setNSeconds(SCALE_UP_COOLDOWN_S);
      }
    } else if ((demand[0] / supply[0]) < SCALE_DOWN_UTILIZATION && (demand[1] / supply[1]) < SCALE_DOWN_UTILIZATION && numWorkers > 0) {
      if (this.scaleDownCooldown.isExpired() === false) {
        Loggers.base.info("[Engine] Too much CPU & RAM - not scaling due to down-cooldown");
      } else {
        Loggers.base.info("[Engine] Scaling down - too much CPU & RAM");
        this.provider.resizeCluster(numWorkers - 1);
        this.scaleDownCooldown.setNSeconds(SCALE_DOWN_COOLDOWN_S);
      }
    } else {
      Loggers.base.info("[Engine] No action necessary");
    }

    setTimeout(() => { this.reactLoop(); }, REACT_INTERVAL);

    return;
  }

  /**
   * This function should be invoked when HyperFlow event is emitted.
   * @param name event name
   * @param values event values
   */
  private onHFEngineEvent(name: String, values: any[]): void {
    Loggers.base.debug("[Engine] Received HyperFlow's engine event " + name + ': ' + JSON.stringify(values));
    if (name != "persist") {
      Loggers.base.warn("[Engine] Unknown event type: " + name);
      return;
    }
    if (values.length != 2) {
      Loggers.base.warn("[Engine] Incorrect event's values length: " + name);
      return;
    }
    let eventTime = new Date(values[0]);
    let details = values[1];

    // A. Event send just before running WF
    if (details[0] == "info") {
      if (this.workflowTracker === undefined) {
        let wfDir = details[1];
        this.workflow = Workflow.createFromFile(wfDir);
        this.workflowTracker = new WorkflowTracker(this.workflow);
        let printInterval = setInterval(() => {
          this.workflowTracker.printState();
        }, 100);
      } else {
        throw Error("Received duplicate of start event info - tracker cannot be re-initialized");
      }
      this.workflowTracker.notifyStart(eventTime);
    }
    // B. Event sent on execution beginning (initial signals)
    else if (details[0] == "input") {
      let signalId = details[2]._id;
      // signals coming from -s option (those all ins from workflow.json),
      // are sent with ID as strings
      signalId = parseInt(signalId);
      if (isNaN(signalId)) {
        throw Error("Received invalid input event, with signal " + details[1]._id.toString());
      }
      this.workflowTracker.notifyInitialSignal(signalId, eventTime);
    }
    // C. Event sent on execution beginning (initial signals)
    else if (details[0] == "fired") {
      let processId = details[2];
      if (typeof processId !== "number") {
        throw Error("Received invalid fired event, with process " + processId.toString());
      }
      this.workflowTracker.notifyProcessFinished(processId, eventTime);
    } else {
      Loggers.base.warn("[Engine] Unknown event details' type: " + details[0]);
    }

    return;
  }
}

var args = process.argv.slice(2);
if (args.length != 1) {
  throw Error("ERROR: 1 argument expected, got " + args.length.toString());
}
let providerName = args[0];
let engine = new Engine(providerName);
engine.run();
