import ResourceRequirements from "../../kubernetes/resourceRequirements";
import Timeframe from "../../utils/timeframe";

const SCALING_PROBE_TIME_MS = 100;
const MAX_MACHINES = 8;

type timestamp = number;
type milliseconds = number;

class ScalingOptimizer
{
  private runningMachines: number;
  private machineType: MachineType;
  private provisioningTimeMs: number;
  private analyzedTimeMs: number;
  private billingModel: BillingModel;

  constructor(runningMachines: number, machineType: MachineType, provisioningTimeMs: number, analyzedTimeMs: number, billingModel: BillingModel) {
    this.runningMachines = runningMachines;
    this.machineType = machineType;
    this.provisioningTimeMs = provisioningTimeMs;
    this.analyzedTimeMs = analyzedTimeMs;
    this.billingModel = billingModel;
  }

  /**
   * Generates average demand (baseline) on given scaling probe intervals.
   *
   * @param demandFrames demand frames
   * @param startTime timestamp of first interval start
   * @param endTime timestamp of last interval end
   * @param interval interval in milliseconds
   */
  getDemandBaseline(demandFrames: Map<timestamp, ResourceRequirements[]>, startTime: timestamp, endTime: timestamp, interval: milliseconds): Map<timestamp, ResourceRequirements> {
    let equalizedData = Timeframe.packEqualIntervals(demandFrames, startTime, endTime, interval);
    let filledData: Map<timestamp, ResourceRequirements[]> = Timeframe.fillEmptyWithLast(equalizedData, [new ResourceRequirements({cpu: "0", mem: "0"})]);
    let baseLine: Map<timestamp, ResourceRequirements> = new Map();
    filledData.forEach((resArr, key) => {
      baseLine.set(key, ResourceRequirements.Utils.getAverage(resArr));
    });
    return baseLine;
  }

  /**
   * Calculates result of scaling decision.
   *
   * @param demandBaseline
   * @param startTime
   * @param endTime
   * @param machinesDiff
   * @param scalingTime
   */
  calculateScalingResult(demandBaseline: Map<number, ResourceRequirements>, startTime: timestamp, endTime: timestamp, machinesDiff: number, scalingTime: timestamp): ScalingResult {
    //console.log("Analyzing result of scaling ", Math.abs(machinesDiff), "machines", ((machinesDiff >= 0) ? "up" : "down"), "at", scalingTime);
    let scalingResult = new ScalingResult();

    /* Calculate total price. */
    let machinesUnscaled = this.runningMachines;
    let machinesScaled = this.runningMachines + machinesDiff;
    let priceUnscaled = this.billingModel.getPriceForInterval(this.machineType, startTime, scalingTime) * machinesUnscaled;
    let priceScaled = this.billingModel.getPriceForInterval(this.machineType, scalingTime, endTime) * machinesScaled;
    let totalPrice = priceUnscaled + priceScaled;
    scalingResult.setPrice(totalPrice);

    /* Calculate total score (based on under/overprovision). */
    let supplyBeforeScaling = new ResourceRequirements({
      cpu: (machinesUnscaled * this.machineType.getCpuMillis()).toString() + "m",
      mem: (machinesUnscaled * this.machineType.getMemBytes()).toString(),
    });
    let supplyAfterScaling = new ResourceRequirements({
      cpu: (machinesScaled * this.machineType.getCpuMillis()).toString() + "m",
      mem: (machinesScaled * this.machineType.getMemBytes()).toString(),
    });

    let timeScaledAndReadyMs = scalingTime + this.provisioningTimeMs;
    demandBaseline.forEach((demand, timeKeyMs) => {
      if (timeKeyMs >= timeScaledAndReadyMs) {
        scalingResult.addFrame(supplyBeforeScaling, demand);
      } else {
        scalingResult.addFrame(supplyAfterScaling, demand);
      }
    });

    return scalingResult;
  }

  /**
   * Finds most promising scaling decision for given demandFrames.
   *
   * @param startTime
   * @param demandFrames
   */
  findBestDecision(startTime: Date, demandFrames: Map<number, ResourceRequirements[]>): ScalingDecision {
    /* Get average supply over equal time frames - this is our baseline for calculations. */
    let startTimeMs = startTime.getTime();
    let maxTimeMs = startTimeMs + this.analyzedTimeMs;
    let demandBaseline = this.getDemandBaseline(demandFrames, startTimeMs, maxTimeMs, SCALING_PROBE_TIME_MS);

    /* Get space of possible machines, there must at least 1 running,
     * and we cannot exceed our provider's quota. */
    let possbileLessMachines = this.runningMachines - 1;
    let possibleMoreMachines = MAX_MACHINES - this.runningMachines;

    /* Get the result of NO scaling at all - our base for comparing actions. */
    let bestScalingDecision = new ScalingDecision(0, startTimeMs);
    let scalingRes = this.calculateScalingResult(demandBaseline, startTimeMs, maxTimeMs, bestScalingDecision.getMachinesDiff(), bestScalingDecision.getTime());
    let bestScalingPrice = scalingRes.getPrice();
    let bestScalingScore = scalingRes.getScore();
    //console.log('  0' + ' at ' + startTimeMs.toString() + ': ' + scalingRes.getPrice().toString() + '$, score ' + scalingRes.getScore().toString());

    /* Try every possible scaling decision at given probe interval,
     * and find best option. */
    for (let t = startTimeMs; t < maxTimeMs; t += SCALING_PROBE_TIME_MS) {
      for (let n = (possbileLessMachines*(-1)); n < possibleMoreMachines; n++) {
        /* No-scaling action was already calculated. */
        if (n == 0) {
          continue;
        }
        /* Calculate result; update best one if we get higher score, or same with less price. */
        scalingRes = this.calculateScalingResult(demandBaseline, startTimeMs, maxTimeMs, n, t);
        //console.log(n.toString().padStart(3, ' ') + ' at ' + t.toString() + ': ' + scalingRes.getPrice().toString().padStart(12, ' ') + ' $, score ' + scalingRes.getScore().toFixed(6).toString().padStart(8, ' '));
        let scalingPrice = scalingRes.getPrice(); // 'C' in math equation
        let scalingScore = scalingRes.getScore();
        if (scalingScore > bestScalingScore || (scalingScore == bestScalingScore && scalingPrice < bestScalingPrice)) {
          bestScalingDecision = new ScalingDecision(n, t);
          bestScalingPrice = scalingPrice;
          bestScalingScore = scalingScore;
        }
      }
    }

    return bestScalingDecision;
  }

}

export default ScalingOptimizer;




import { GCPMachines, N1_HIGHCPU_4 } from "../../cloud/gcpMachines";
import StaticEstimator from "../estimators/staticEstimator";
import WorkflowTracker from "../tracker/tracker";
import Workflow from "../tracker/workflow";
import Plan from "./plan";
import MachineType from "../../cloud/machine";
import BillingModel from "../../cloud/billingModel";
import GCPBillingModel from "../../cloud/gcpBillingModel";
import ScalingResult from "./scalingResult";
import ScalingDecision from "./scalingDecision";

let wfStart: Date | undefined;

async function getDemandFrames() {
  let wfDir = './assets/wf_example';
  let workflow = Workflow.createFromFile(wfDir);
  let tracker = new WorkflowTracker(workflow);

  //// Optionals steps
  //let startTime = new Date();
  //tracker.notifyStart(startTime);
  //for (let sigId of [1,4,5,8,11,14,17,20,23,26,29,32,33,68,70,92,94]) {
  //  tracker.notifyInitialSignal(sigId, new Date());
  //}
  //for (let procId of [1,2,3,4,5,6,7,8,9,10,11,12,14]) {
  //  let randDelay = Math.floor(Math.random() * 500);
  //  await new Promise((res, rej) => { setTimeout(res, randDelay); });
  //  tracker.notifyProcessFinished(procId, new Date());
  //}

  let estimator = new StaticEstimator();
  let plan = new Plan(workflow, tracker, 50000, estimator);
  plan.run();

  wfStart = tracker.getExecutionStartTime();

  console.log(plan.getStateHistory());
  let demandFrames = plan.getDemandFrames();
  console.log(demandFrames);
  return demandFrames;
}

async function test() {
  let demandFrames = await getDemandFrames();
  let machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
  let optimizer = new ScalingOptimizer(1, machineType, 10*1000, 50*1000, new GCPBillingModel());
  let bestDecision = optimizer.findBestDecision(wfStart || new Date(), demandFrames);
  console.log('BEST DECISION:', bestDecision.getMachinesDiff(), bestDecision.getTime());
  console.log('Done!');
}

test();
