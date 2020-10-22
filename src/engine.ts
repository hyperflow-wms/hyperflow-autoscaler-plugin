#!/usr/bin/env node
import { getBaseLogger } from './utils/logger';
import BaseProvider from './kubernetes/providers/baseProvider';
import CooldownTracker from './utils/cooldownTracker';
import DummyProvider from './kubernetes/providers/dummyProvider';
import KindProvider from './kubernetes/providers/kindProvider';
import GCPProvider from './kubernetes/providers/gcpProvider';
import RPCChild from "./communication/rpcChild";
import withTimeout from './utils/withTimeout'
import WorkflowTracker from './hyperflow/tracker/tracker';
import Workflow from './hyperflow/tracker/workflow';
import BillingModel from './cloud/billingModel';
import GCPBillingModel from './cloud/gcpBillingModel';
import Policy from './policies/policy';
import ReactPolicy from './policies/reactPolicy';
import { GCPMachines } from './cloud/gcpMachines';
import MachineType from './cloud/machine';
import PredictPolicy from './policies/predictPolicy';

const Logger = getBaseLogger();

const REACT_INTERVAL = 10000;
const SCALE_UP_UTILIZATION = 0.9;
const SCALE_DOWN_UTILIZATION = 0.5;

const SCALE_UP_COOLDOWN_S = 3 * 60;
const SCALE_DOWN_COOLDOWN_S = 3 * 60;

class Engine {

  private provider: BaseProvider;
  private billingModel: BillingModel;
  private rpc: RPCChild;
  private workflow: Workflow;
  private workflowTracker: WorkflowTracker;
  private machineType: MachineType;
  private policy: Policy;

  constructor(providerName: string) {
    Logger.info("[Engine] Trying to create provider " + providerName);
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
    this.billingModel = new GCPBillingModel();
    this.rpc = new RPCChild(this);

    let machineTypeName = process.env['HF_VAR_autoscalerMachineType'];
    if (machineTypeName == undefined) {
      throw Error('No machine type specified. Hint: use env var HF_VAR_autoscalerMachineType');
    }
    this.machineType = GCPMachines.makeObject(machineTypeName);

    let policyName = process.env['HF_VAR_autoscalerPolicy'];
    Logger.info("[Engine] Trying to create policy '" + policyName + "'");
    if (policyName == "react") {
      this.policy = new ReactPolicy(this.workflowTracker, this.billingModel, this.machineType);
    } else if (policyName == "predict") {
      this.policy = new PredictPolicy(this.workflowTracker, this.billingModel, this.machineType);
    } else {
      throw Error('No valid policy specified. Hint: use env var HF_VAR_autoscalerPolicy');
    }
  }

  public async run(): Promise<void> {
    this.rpc.init();
    //this.rpc.call('addNumbers', [21, 15], (data) => { console.log('Got RPC response:', data); });
    //let sum = await this.rpc.callAsync('addNumbers', [21, 15]);
    await this.provider.initialize();

    this.reactLoop();
  }

  private async reactLoop(): Promise<void> {
    Logger.verbose("[Engine] React loop started");
    await this.provider.updateClusterState();
    Logger.verbose("[Engine] Cluster state updated");

    let numWorkers: number;
    try {
      numWorkers = this.provider.getNumNodeWorkers();
    } catch (err) {
      throw Error("Unable to get number of workers: " + err.message);
    }
    let supply = this.provider.getSupply();
    let demand = this.provider.getDemand();

    Logger.verbose('[Engine] Number of HyperFlow workers: ' + numWorkers);
    Logger.verbose('[Engine] Demand: ' + demand);
    Logger.verbose('[Engine] Supply: ' + supply);

    let scalingDecision = this.policy.getDecision(demand, supply, numWorkers);
    Logger.debug("[Engine] Recomended action: " + scalingDecision.getMachinesDiff().toString() + " at " + scalingDecision.getTime());
    let machinesDiff = scalingDecision.getMachinesDiff();
    if (machinesDiff == 0) {
      Logger.info("[Engine] No action necessary");
    } else {
      if (this.policy.isReady(scalingDecision) === false) {
        Logger.info("[Engine] No action, due to policy condition: not_ready");
      } else {
        if (machinesDiff > 0) {
          Logger.info("[Engine] Scaling up");
        } else {
          Logger.info("[Engine] Scaling down");
        }
        // TODO: postpone scaling to appropriate time
        this.provider.resizeCluster(numWorkers + machinesDiff);
        // TODO: notify about new time (updated decision)
        this.policy.actionTaken(scalingDecision);
      }
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
    Logger.debug("[Engine] Received HyperFlow's engine event " + name + ': ' + JSON.stringify(values));
    if (name != "persist") {
      Logger.warn("[Engine] Unknown event type: " + name);
      return;
    }
    if (values.length != 2) {
      Logger.warn("[Engine] Incorrect event's values length: " + name);
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
      Logger.warn("[Engine] Unknown event details' type: " + details[0]);
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
