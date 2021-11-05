type timestamp = number;

class ScalingDecision {
  private machinesDiff: number;
  private time: timestamp;

  public constructor(machinesDiff: number, time: timestamp) {
    this.machinesDiff = machinesDiff;
    this.time = time;
  }

  /**
   * Getter for machinesDiff.
   */
  public getMachinesDiff(): number {
    return this.machinesDiff;
  }

  /**
   * Getter for time.
   */
  public getTime(): timestamp {
    return this.time;
  }
}

export default ScalingDecision;
