import BillingModel from "./billingModel";
import { N1_HIGHCPU_2, N1_HIGHCPU_4, N1_HIGHCPU_8, N1_HIGHCPU_16, N1_HIGHCPU_32, N1_HIGHCPU_64, N1_HIGHCPU_96 } from './gcpMachines';
import MachineType from "./machine";

type timestamp = number;
type milliseconds = number;

class GCPBillingModel extends BillingModel
{
  /**
   * @inheritdoc
   */
  public getPriceForTime(machine: MachineType, time: milliseconds): number {
    /* VM instances are billed at least for 1 minute,
     * then billed secondly (rounding up). */
    let workingTime = time;
    if (workingTime < (60*1000)) {
      workingTime = 60*1000;
    }
    let workingSeconds = Math.ceil(workingTime / 1000);

    /* Calculate price. */
    let workingHours = workingSeconds / 3600;
    let machineHourlyPrice = this.getHourlyPrice(machine)
    let runningPrice = workingHours * machineHourlyPrice;

    return runningPrice;
  }

  /**
   * @inheritdoc
   */
  public getHourlyPrice(machine: MachineType): number {
    let name = machine.getName();
    /* Note: this are prices for us-central-1 zone. */
    switch (name) {
      case N1_HIGHCPU_2:
        return 0.0708486;
      case N1_HIGHCPU_4:
        return 0.1416972;
      case N1_HIGHCPU_8:
        return 0.2833944;
      case N1_HIGHCPU_16:
        return 0.5667888;
      case N1_HIGHCPU_32:
        return 1.1335776;
      case N1_HIGHCPU_64:
        return 2.2671552;
      case N1_HIGHCPU_96:
        return 3.4007328;
      default:
    }
    throw Error("Unknown price for machine " + name);
  }

  /**
   * @inheritdoc
   */
  public getPriceForDynamicInterval(machine: MachineType, timeStart: timestamp, numBefore: number, resizeTime: timestamp, numAfter: number, timeEnd: timestamp): number {
    /* Calulate price for machines that are before and after resize. */
    let numCommonMachines = Math.min(numBefore, numAfter);
    let offset = Math.abs(numBefore - numAfter);
    let commonMachinesPrice = numCommonMachines * this.getPriceForInterval(machine, timeStart, timeEnd);
    if (offset == 0) {
      return commonMachinesPrice;
    }

    /* Resize-down case. */
    let restMachinesPrice = 0;
    if (numBefore > numAfter) {
      restMachinesPrice = offset * this.getPriceForInterval(machine, timeStart, resizeTime);
    }

    /* Resize-up case. */
    if (numBefore < numAfter) {
      restMachinesPrice = offset * this.getPriceForInterval(machine, resizeTime, timeEnd);
    }

    let totalPrice = commonMachinesPrice + restMachinesPrice;
    return totalPrice;
  }
}

export default GCPBillingModel;
