import { HFProcess } from "../types";

class Process {

  public readonly name: string;
  public readonly ins: number[];
  public readonly outs: number[];

  private startTime?: Date;
  private endTime?: Date;

  public constructor(process: HFProcess) {
    this.name = process.name;
    this.ins = process.ins;
    this.outs = process.outs;
  }

  public markStart(time: Date): void {
    if (this.startTime !== undefined) {
      throw Error('Process already marked as started');
    }
    this.startTime = time;
    return;
  }

  public markEnd(time: Date): void {
    if (this.endTime !== undefined) {
      throw Error('Process already marked as ended');
    }
    this.endTime = time;
    return;
  }

}

export default Process;
