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

type timestamp = number;

const Logger = getBaseLogger();

const INITIAL_DELAY = 30; // seconds

const REACT_INTERVAL = 30000; // milliseconds
const POLICY_INIT_CHECK_INTERVAL = 1000;

class Engine {

  private provider: BaseProvider;
  private billingModel: BillingModel;
  private rpc: RPCChild;
  private workflow: Workflow;
  private workflowTracker: WorkflowTracker;
  private machineType: MachineType;
  private policy?: Policy;

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
  }

  public async run(): Promise<void> {
    this.rpc.init();
    //this.rpc.call('addNumbers', [21, 15], (data) => { console.log('Got RPC response:', data); });
    //let sum = await this.rpc.callAsync('addNumbers', [21, 15]);
    await this.provider.initialize();
    await this.waitInitialDelay();
    this.reactLoop();
  }

  /**
   * Initial (configured) delay for engine start.
   * It is important to wait until cluster change state, before
   * we take any action.
   */
  private async waitInitialDelay() {
    let engineInitialDelay = INITIAL_DELAY;
    let engineInitialDelaySetting = process.env['HF_VAR_autoscalerInitialDelay'];
    if (engineInitialDelaySetting != undefined) {
      let val = parseInt(engineInitialDelaySetting);
      if (isNaN(val) === true) {
        throw Error("Invalid value of HF_VAR_autoscalerInitialDelay, must be number");
      }
      engineInitialDelay = val;
    }
    if (engineInitialDelay > 0) {
      Logger.verbose("[Engine] Waiting " + engineInitialDelay.toString() + " seconds (initial delay)");
      await new Promise((res, rej) => setTimeout(res, engineInitialDelay * 1000));
    }
    return;
  }

  private async reactLoop(): Promise<void> {
    Logger.verbose("[Engine] React loop started");

    if (this.policy === undefined) {
      Logger.verbose("[Engine] Policy still not ready");
      setTimeout(() => { this.reactLoop(); }, POLICY_INIT_CHECK_INTERVAL);
      return;
    }

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
        let targetPoolSize = numWorkers + machinesDiff;
        if (machinesDiff > 0) {
          Logger.info("[Engine] Scaling up from " + numWorkers.toString() + " to " + targetPoolSize.toString() + " machines");
        } else {
          Logger.info("[Engine] Scaling down from " + numWorkers.toString() + " to " + targetPoolSize.toString() + " machines");
        }
        // TODO: postpone scaling to appropriate time
        try {
          await this.provider.resizeCluster(targetPoolSize);
          // TODO: notify about new time (updated decision)
          this.policy.actionTaken(scalingDecision);
        } catch (err) {
          Logger.error("[Engine] Unable to resize cluster: " + err);
        }
      }
    }

    setTimeout(() => { this.reactLoop(); }, REACT_INTERVAL);

    return;
  }

  /**
   * Notify engine about started workflow, so policies can
   * be assigned.
   *
   * @param wfDir workflow directory
   * @param eventTime when workflow was started
   */
  private wfInstanceStarted(wfDir: string, eventTime: timestamp): void {
    if (this.workflowTracker !== undefined) {
      throw Error("Tracker cannot be re-initialized: only one running workflow is supported");
    }
    this.workflow = Workflow.createFromFile(wfDir);
    this.workflowTracker = new WorkflowTracker(this.workflow);
    let printInterval = setInterval(() => {
      this.workflowTracker.printState();
    }, 100);
    let policyName = process.env['HF_VAR_autoscalerPolicy'];
    Logger.info("[Engine] Trying to create policy '" + policyName + "'");
    if (policyName == "react") {
      this.policy = new ReactPolicy(this.workflowTracker, this.billingModel, this.machineType);
    } else if (policyName == "predict") {
      this.policy = new PredictPolicy(this.workflowTracker, this.billingModel, this.machineType);
    } else {
      throw Error('No valid policy specified. Hint: use env var HF_VAR_autoscalerPolicy');
    }
    this.workflowTracker.notifyStart(eventTime);
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
    let eventTime: timestamp = values[0];
    let details = values[1];

    // A. Event send just before running WF
    if (details[0] == "info") {
      let wfDir = details[1];
      this.wfInstanceStarted(wfDir, eventTime);
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
    // C. Event sent when process execution was finished
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
