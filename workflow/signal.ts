import { HFSignal } from "../types";

class Signal {

  private name: string;

  private emitTime?: Date;

  public constructor(process: HFSignal) {
    this.name = process.name;
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
