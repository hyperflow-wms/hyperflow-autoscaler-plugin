import { HFSignal } from "../types";

class Signal {

  public readonly id: number;
  public readonly initial: boolean;

  private name: string;

  private emitTime?: Date;

  public constructor(process: HFSignal, id: number) {
    this.id = id;
    this.name = process.name;
    // data property is indicator of initial signal
    if (process.data === undefined) {
      this.initial = true;
    } else {
      this.initial = false;
    }
  }

  public markEmit(time: Date): void {
    if (this.emitTime !== undefined) {
      throw Error('Signal already marked as emitted');
    }
    this.emitTime = time;
    return;
  }

  public wasEmitted(): boolean {
    if (this.emitTime !== undefined) {
      return true;
    }
    return false;
  }
}

export default Signal;
