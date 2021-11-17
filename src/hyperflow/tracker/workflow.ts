/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBaseLogger } from '../../utils/logger';
import { HFWorkflow } from '../types';
import Process from './process';
import Signal from './signal';

const Logger = getBaseLogger();

class Workflow {
  private id: string;
  private name: string;
  private data?: Signal[];
  private signals?: Signal[];
  private processes?: Process[];
  private tasks?: Process[];
  private ins: number[];
  private outs: number[];

  public constructor(wfId: string, workflow: HFWorkflow) {
    this.id = wfId;
    this.name = workflow.name;

    this.ins = workflow.ins;
    this.outs = workflow.outs;

    // NOTE: HyperFlow uses 1-based indexing, so we use the same format
    this.data = workflow.data?.map((sig, idx) => new Signal(sig, idx + 1));
    this.signals = workflow.signals?.map(
      (sig, idx) => new Signal(sig, idx + 1)
    );
    this.processes = workflow.processes?.map((proc, idx) => {
      proc.ins = proc.ins.map((x) => x + 1);
      proc.outs = proc.outs.map((x) => x + 1);
      return new Process(proc, idx + 1);
    });
    this.tasks = workflow.tasks?.map((proc, idx) => {
      proc.ins = proc.ins.map((x) => x + 1);
      proc.outs = proc.outs.map((x) => x + 1);
      return new Process(proc, idx + 1);
    });
  }

  public getId(): string {
    return this.id;
  }

  public getSignals(): Signal[] {
    if (this.data !== undefined) {
      return this.data;
    }
    if (this.signals !== undefined) {
      return this.signals;
    }
    return [];
  }

  public getProcesses(): Process[] {
    if (this.tasks !== undefined) {
      return this.tasks;
    }
    if (this.processes !== undefined) {
      return this.processes;
    }
    return [];
  }

  /**
   * Gets all initial signals - those with defined
   * 'data' property.
   */
  public getInitialSigIds(): number[] {
    const intitialSigs = this.getSignals().filter((sig) => sig.initial == true);
    const sigIds = intitialSigs.map((x) => x.id);
    return sigIds;
  }

  /**
   * Get all WF's input signals - those that are fired
   * with '-s' option.
   */
  public getWfInsSigIds(): number[] {
    return this.ins;
  }

  public static createFromJson(wfId: string, wfJson: any): Workflow {
    Logger.debug(
      `[WorkflowTracker] Reading HF workflow from JSON ${JSON.stringify(
        wfJson
      )}`
    );
    const wf = new Workflow(wfId, wfJson);
    return wf;
  }
}

export default Workflow;
