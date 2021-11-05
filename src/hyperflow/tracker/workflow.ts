import { getBaseLogger } from '../../utils/logger';
import { HFWorkflow } from '../types';
import Process from './process';
import Signal from './signal';

import * as fs from 'fs';
import * as pathtool from 'path';

const Logger = getBaseLogger();

class Workflow {
  private name: string;
  private data?: Signal[];
  private signals?: Signal[];
  private processes?: Process[];
  private tasks?: Process[];
  private ins: number[];
  private outs: number[];

  public constructor(workflow: HFWorkflow) {
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

  /**
   * Reads HyperFlow's workflow.json.
   * @param directory Workflow root directory
   */
  public static createFromFile(directory: string): Workflow {
    Logger.debug('[WorkflowTracker] Reading HF workflow from ' + directory);
    const wfFile = pathtool.join(directory, 'workflow.json');
    const wfFileContent = fs.readFileSync(wfFile, 'utf8');
    const rawWf = JSON.parse(wfFileContent);
    const wf = new Workflow(rawWf);

    return wf;
  }
}

export default Workflow;
