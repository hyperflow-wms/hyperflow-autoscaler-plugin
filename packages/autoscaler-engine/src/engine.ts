#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBaseLogger } from '@hyperflow/logger';
import BaseProvider from './kubernetes/providers/baseProvider';
import DummyProvider from './kubernetes/providers/dummyProvider';
import KindProvider from './kubernetes/providers/kindProvider';
import GCPProvider from './kubernetes/providers/gcpProvider';
import WorkflowTracker from './hyperflow/tracker/tracker';
import Workflow from './hyperflow/tracker/workflow';
import BillingModel from './cloud/billingModel';
import GCPBillingModel from './cloud/gcpBillingModel';
import Policy from './policies/policy';
import ReactPolicy from './policies/reactPolicy';
import { GCPMachines } from './cloud/gcpMachines';
import MachineType from './cloud/machine';
import PredictPolicy from './policies/predictPolicy';
import HttpApi from './http/httpApi';
import RPCChild from './communication/rpcChild';

type timestamp = number;

const Logger = getBaseLogger();

const INITIAL_DELAY = 30; // seconds

const REACT_INTERVAL = 30000; // milliseconds

class Engine {
  private provider: BaseProvider;
  private billingModel: BillingModel;
  private rpc: RPCChild;
  private api: HttpApi;
  private machineType: MachineType;
  private policy: Policy;
  private isStandalone: boolean;

  constructor(providerNameArg?: string) {
    this.isStandalone = providerNameArg ? false : true;
    const providerName =
      providerNameArg || process.env['HF_VAR_autoscalerProvider'];
    if (providerName === undefined) {
      Logger.error('Provider name is empty, exiting...');
      process.exit(1);
    }
    Logger.info('[Engine] Trying to create provider ' + providerName);
    if (providerName == 'gcp') {
      this.provider = new GCPProvider();
    } else if (providerName == 'kind') {
      this.provider = new KindProvider();
    } else if (providerName == 'dummy') {
      this.provider = new DummyProvider();
    }
    if (this.provider === undefined) {
      throw Error('Provider ' + providerName + ' not found!');
    }
    this.billingModel = new GCPBillingModel();
    if (this.isStandalone) {
      this.api = new HttpApi(this, this);
    } else {
      this.rpc = new RPCChild(this);
    }
    const machineTypeName = process.env['HF_VAR_autoscalerMachineType'];
    if (machineTypeName == undefined) {
      throw Error(
        'No machine type specified. Hint: use env var HF_VAR_autoscalerMachineType'
      );
    }
    this.machineType = GCPMachines.makeObject(machineTypeName);
    const policyName = process.env['HF_VAR_autoscalerPolicy'];
    Logger.info("[Engine] Trying to create policy '" + policyName + "'");
    if (policyName == 'react') {
      this.policy = new ReactPolicy(this.billingModel, this.machineType);
    } else if (policyName == 'predict') {
      this.policy = new PredictPolicy(this.billingModel, this.machineType);
    } else {
      throw Error(
        'No valid policy specified. Hint: use env var HF_VAR_autoscalerPolicy'
      );
    }
  }

  public async run(): Promise<void> {
    if (this.isStandalone) {
      this.api.init();
      this.api.listen();
    } else {
      this.rpc.init();
    }
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
    const engineInitialDelaySetting =
      process.env['HF_VAR_autoscalerInitialDelay'];
    if (engineInitialDelaySetting != undefined) {
      const val = parseInt(engineInitialDelaySetting);
      if (isNaN(val) === true) {
        throw Error(
          'Invalid value of HF_VAR_autoscalerInitialDelay, must be number'
        );
      }
      engineInitialDelay = val;
    }
    if (engineInitialDelay > 0) {
      Logger.verbose(
        '[Engine] Waiting ' +
          engineInitialDelay.toString() +
          ' seconds (initial delay)'
      );
      await new Promise((res) => setTimeout(res, engineInitialDelay * 1000));
    }
    return;
  }

  private async reactLoop(): Promise<void> {
    Logger.verbose('[Engine] React loop started');

    await this.provider.updateClusterState();
    Logger.verbose('[Engine] Cluster state updated');

    if (this.policy.areThereAnyWfs()) {
      let numWorkers: number;
      try {
        numWorkers = this.provider.getNumNodeWorkers();
      } catch (err) {
        throw Error('Unable to get number of workers: ' + err.message);
      }
      const supply = this.provider.getSupply();
      const demand = this.provider.getDemand();

      Logger.verbose('[Engine] Number of HyperFlow workers: ' + numWorkers);
      Logger.verbose('[Engine] Demand: ' + demand);
      Logger.verbose('[Engine] Supply: ' + supply);

      const scalingDecision = this.policy.getDecision(
        demand,
        supply,
        numWorkers
      );
      const machinesDiff = scalingDecision.getMachinesDiff();
      const delayMs = Math.max(
        0,
        scalingDecision.getTime() - new Date().getTime()
      ); // Cap delay at 0ms.
      Logger.debug(
        '[Engine] Recomended action: ' +
          scalingDecision.getMachinesDiff().toString() +
          ' after ' +
          delayMs.toString() +
          ' ms.'
      );
      if (machinesDiff == 0) {
        Logger.info('[Engine] No action necessary');
        setTimeout(() => {
          this.reactLoop();
        }, REACT_INTERVAL);
        return;
      }

      /* During MAPE loop we can only "schedule" soon scaling decisions. */
      if (delayMs > REACT_INTERVAL) {
        Logger.info('[Engine] Action is too far from now, skipping execution');
        setTimeout(() => {
          this.reactLoop();
        }, REACT_INTERVAL);
        return;
      }

      /* Wait some time, if there we get delayed decision. */
      if (delayMs > 0) {
        Logger.info(
          '[Engine] Waiting ' + delayMs + ' ms. before performing action'
        );
        await new Promise((res) => {
          setTimeout(res, delayMs);
        });
      }

      /* Perform scaling action. */
      if (this.policy.isReady(scalingDecision) === false) {
        Logger.info('[Engine] No action, due to policy condition: not_ready');
      } else {
        const targetPoolSize = numWorkers + machinesDiff;
        if (machinesDiff > 0) {
          Logger.info(
            '[Engine] Scaling up from ' +
              numWorkers.toString() +
              ' to ' +
              targetPoolSize.toString() +
              ' machines'
          );
        } else {
          Logger.info(
            '[Engine] Scaling down from ' +
              numWorkers.toString() +
              ' to ' +
              targetPoolSize.toString() +
              ' machines'
          );
        }
        try {
          await this.provider.resizeCluster(targetPoolSize);
          this.policy.actionTaken(scalingDecision);
        } catch (err) {
          Logger.error('[Engine] Unable to resize cluster: ' + err);
        }
      }
    } else {
      Logger.info('There are no wfs currently, sleeping...');
    }

    /* Schedule next loop. */
    setTimeout(() => {
      this.reactLoop();
    }, REACT_INTERVAL);

    return;
  }

  /**
   * Notify engine about started workflow, so policies can
   * be assigned.
   *
   * @param wfDir workflow directory
   * @param eventTime when workflow was started
   */
  public startWfInstance(
    wfId: string,
    wfJson: any,
    eventTime: timestamp
  ): void {
    if (this.policy.getWfTracker(wfId)) {
      throw Error(
        `Tracker cannot be re-initialized: only one tracker per workflow is possible`
      );
    }
    const workflow = Workflow.createFromJson(wfId, wfJson);
    Logger.info(`Creating workflow tracker for workflow with id ${wfId}`);
    const workflowTracker = new WorkflowTracker(workflow);
    this.policy.addWfTracker(workflowTracker);
    workflowTracker.notifyStart(eventTime);
  }

  public wfInstanceStarted(
    wfId: string,
    wfDir: string,
    eventTime: timestamp
  ): void {
    if (this.policy.getWfTracker(wfId)) {
      throw Error(
        `Tracker cannot be re-initialized: only one tracker per workflow is possible`
      );
    }
    const workflow = Workflow.createFromFile(wfId, wfDir);
    Logger.info(`Creating workflow tracker for workflow with id ${wfId}`);
    const workflowTracker = new WorkflowTracker(workflow);
    this.policy.addWfTracker(workflowTracker);
    workflowTracker.notifyStart(eventTime);
  }

  public finishWf(wfId: string): void {
    if (this.policy.getWfTracker(wfId) === undefined) {
      throw Error(`Workflow with if ${wfId} does not exist`);
    }
    Logger.info(`Workflow with ${wfId} has ended`);
    this.policy.removeWfTracker(wfId);
  }

  /**
   * This function should be invoked when HyperFlow event is emitted.
   * @param name event name
   * @param values event values
   */
  private onHFEngineEvent(wfId: string, name: string, values: any[]): void {
    Logger.debug(
      "[Engine] Received HyperFlow's engine event " +
        name +
        ': ' +
        JSON.stringify(values)
    );
    if (name != 'persist') {
      Logger.warn('[Engine] Unknown event type: ' + name);
      return;
    }
    if (values.length != 2) {
      Logger.warn("[Engine] Incorrect event's values length: " + name);
      return;
    }
    const eventTime: timestamp = values[0];
    const details = values[1];

    // A. Event send just before running WF
    if (details[0] == 'info') {
      // not used anymore
      if (this.isStandalone) {
        const wfDir = details[1];
        this.wfInstanceStarted(wfId, wfDir, eventTime);
      } else {
        Logger.info('Workflow started');
      }
    }
    // B. Event sent on execution beginning (initial signals)
    else if (details[0] == 'input') {
      let signalId = details[2]._id;
      // signals coming from -s option (those all ins from workflow.json),
      // are sent with ID as strings
      signalId = parseInt(signalId);
      if (isNaN(signalId)) {
        throw Error(
          'Received invalid input event, with signal ' +
            details[1]._id.toString()
        );
      }
      this.policy.getWfTracker(wfId)?.notifyInitialSignal(signalId, eventTime);
    }
    // C. Event sent when process execution was finished
    else if (details[0] == 'fired') {
      const processId = details[2];
      if (typeof processId !== 'number') {
        throw Error(
          'Received invalid fired event, with process ' + processId.toString()
        );
      }
      this.policy
        .getWfTracker(wfId)
        ?.notifyProcessFinished(processId, eventTime);
    } else {
      Logger.warn("[Engine] Unknown event details' type: " + details[0]);
    }

    return;
  }
}

export default Engine;
