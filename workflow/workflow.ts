import { HFWorkflow } from "../types";
import Process from "./process";
import Signal from "./signal";

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
    this.data = workflow.data?.map((sig, idx) => new Signal(sig, idx+1));
    this.signals = workflow.signals?.map((sig, idx) => new Signal(sig, idx+1));
    this.processes = workflow.processes?.map((proc, idx) => {
      proc.ins = proc.ins.map(x => x+1);
      proc.outs = proc.outs.map(x => x+1);
      return new Process(proc, idx+1)
    });
    this.tasks = workflow.tasks?.map((proc, idx) => {
      proc.ins = proc.ins.map(x => x+1);
      proc.outs = proc.outs.map(x => x+1);
      return new Process(proc, idx+1)
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

}

export default Workflow;
