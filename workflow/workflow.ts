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
    this.data = workflow.data?.map(x => new Signal(x));
    this.signals = workflow.signals?.map(x => new Signal(x));
    this.processes = workflow.processes?.map(x => new Process(x));
    this.tasks = workflow.tasks?.map(x => new Process(x));
    this.ins = workflow.ins;
    this.outs = workflow.outs;
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
