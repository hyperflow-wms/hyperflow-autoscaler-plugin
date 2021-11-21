import { HFSignal } from '@hyperflow/types';

type timestamp = number;

class Signal {
  public readonly id: number;
  public readonly initial: boolean;

  private name: string;

  private emitTime?: timestamp;

  /**
   * Constructor - it also allows copying object .
   */
  public constructor(signal: HFSignal | Signal, id?: number) {
    if (signal instanceof Signal) {
      this.id = signal.id;
      this.initial = signal.initial;
      this.name = signal.name;
      this.emitTime = signal.emitTime ? signal.emitTime : undefined;
    } else {
      if (id === undefined) {
        throw Error('ID is required for Signal');
      }
      this.id = id;
      this.name = signal.name;
      // data property is indicator of initial signal
      if (signal.data !== undefined) {
        this.initial = true;
      } else {
        this.initial = false;
      }
    }
  }

  public markEmit(time: timestamp): void {
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
