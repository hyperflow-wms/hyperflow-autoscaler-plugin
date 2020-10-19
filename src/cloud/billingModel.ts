import MachineType from "./machine";

type timestamp = number;
type milliseconds = number;

abstract class BillingModel
{
  /**
   * Gets total price for running given machine type.
   * @param machine MachineType
   * @param time milliseconds
   */
  public abstract getPriceForTime(machine: MachineType, time: milliseconds): number;

  /**
   * Wrapper of getPriceForTime.
   * @param machine
   * @param timeStart
   * @param timeEnd
   */
  public getPriceForInterval(machine: MachineType, timeStart: timestamp, timeEnd: timestamp): number {
    let time = timeEnd - timeStart;
    return this.getPriceForTime(machine, time);
  }

  /**
   * Get hourly price for machine.
   * @param machine MachineType
   */
  public abstract getHourlyPrice(machine: MachineType): number;
}

export default BillingModel;
