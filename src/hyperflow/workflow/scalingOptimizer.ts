import { getBaseLogger } from "../../utils/logger";
import ResourceRequirements from "../../kubernetes/resourceRequirements";
import Timeframe from "../../utils/timeframe";
import { ScalingResult, ScoreOptions } from "./scalingResult";

const Logger = getBaseLogger();

const DEFAULT_SCALING_PROBE_TIME_MS = 100;
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
  private scoreOptions: ScoreOptions
  private scalingProbeTime: milliseconds;

  constructor(runningMachines: number, machineType: MachineType, provisioningTimeMs: number, analyzedTimeMs: number, billingModel: BillingModel) {
    this.runningMachines = runningMachines;
    this.machineType = machineType;
    this.provisioningTimeMs = provisioningTimeMs;
    this.analyzedTimeMs = analyzedTimeMs;
    this.billingModel = billingModel;
    this.scoreOptions = {skipOverProvision: false}
    this.scalingProbeTime = DEFAULT_SCALING_PROBE_TIME_MS;
  }

  public setScalingProbeTime(ms: milliseconds): void {
    this.scalingProbeTime = ms;
  }

  public setScoreOptions(opts: ScoreOptions): void {
    this.scoreOptions = opts;
    return;
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
    //Logger.debug("Analyzing result of scaling " + Math.abs(machinesDiff).toString() + " machines " + ((machinesDiff >= 0) ? "up" : "down") + " at " + scalingTime.toString());
    let scalingResult = new ScalingResult();

    /* Calculate total price. */
    let machinesUnscaled = this.runningMachines;
    let machinesScaled = this.runningMachines + machinesDiff;
    let totalPrice = this.billingModel.getPriceForDynamicInterval(this.machineType, startTime, machinesUnscaled, scalingTime, machinesScaled, endTime);
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
        scalingResult.addFrame(supplyAfterScaling, demand);
      } else {
        scalingResult.addFrame(supplyBeforeScaling, demand);
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
  findBestDecision(startTimeMs: timestamp, demandFrames: Map<number, ResourceRequirements[]>): ScalingDecision {
    /* Get average supply over equal time frames - this is our baseline for calculations. */
    let maxTimeMs = startTimeMs + this.analyzedTimeMs;
    let demandBaseline = this.getDemandBaseline(demandFrames, startTimeMs, maxTimeMs, this.scalingProbeTime);

    /* Get space of possible machines, there must at least 1 running,
     * and we cannot exceed our provider's quota. */
    let possbileLessMachines = this.runningMachines - 1;
    let possibleMoreMachines = MAX_MACHINES - this.runningMachines;

    /* Get the result of NO scaling at all - our base for comparing actions. */
    let bestScalingDecision = new ScalingDecision(0, startTimeMs);
    let scalingRes = this.calculateScalingResult(demandBaseline, startTimeMs, maxTimeMs, bestScalingDecision.getMachinesDiff(), bestScalingDecision.getTime());
    let bestScalingPrice = scalingRes.getPrice();
    let bestScalingScore = scalingRes.getScore(this.scoreOptions);
    //Logger.debug('Scaling res for no action at ' + startTimeMs.toString() + ': ' + scalingRes.getPrice().toString() + '$, score ' + scalingRes.getScore({}).toString());

    /* Try every possible scaling decision at given probe interval,
     * and find best option. */
    for (let t = startTimeMs; t < maxTimeMs; t += this.scalingProbeTime) {
      for (let n = (possbileLessMachines*(-1)); n <= possibleMoreMachines; n++) {
        /* No-scaling action was already calculated. */
        if (n == 0) {
          continue;
        }
        /* Calculate result; update best one if we get higher score, or same with less price. */
        scalingRes = this.calculateScalingResult(demandBaseline, startTimeMs, maxTimeMs, n, t);
        let scalingPrice = scalingRes.getPrice(); // 'C' in math equation
        let scalingScore = scalingRes.getScore(this.scoreOptions);

        /* Debug logging for scaling at first time frame. */
        if (t == startTimeMs) {
          Logger.debug('[ScalingOptimizer] Scaling result for ' + (n.toString().padStart(3, ' ') + ' machines at ' + t.toString() + ': ' + scalingRes.getPrice().toString().padStart(12, ' ') + ' $, score ' + scalingRes.getScore({}).toFixed(6).toString().padStart(8, ' ')));
        }

        /* Ignore all solutions where we get strictly lower score. */
        if (scalingScore < bestScalingScore) {
          continue;
        }

        /* Handle case when we reached same score (eg. Infinity),
         * but we might get lower price. */
        if (scalingScore == bestScalingScore && scalingPrice >= bestScalingPrice) {
          continue;
        }

        bestScalingDecision = new ScalingDecision(n, t);
        bestScalingPrice = scalingPrice;
        bestScalingScore = scalingScore;
      }
    }
    Logger.debug("[ScalingOptimizer] Best descision found: " + bestScalingDecision.getMachinesDiff().toString()
                + " at " + bestScalingDecision.getTime().toString() + " with score " + bestScalingScore.toString());

    return bestScalingDecision;
  }

}

export default ScalingOptimizer;




import { GCPMachines, N1_HIGHCPU_4 } from "../../cloud/gcpMachines";
import StaticProcessEstimator from "../estimators/staticProcessEstimator";
import WorkflowTracker from "../tracker/tracker";
import Workflow from "../tracker/workflow";
import Plan from "./plan";
import MachineType from "../../cloud/machine";
import BillingModel from "../../cloud/billingModel";
import GCPBillingModel from "../../cloud/gcpBillingModel";
import ScalingDecision from "./scalingDecision";

let wfStart: timestamp | undefined;

function mapToString(map: Map<any,any>) {
  var obj = {}
  map.forEach(function(v, k){
    obj[k] = v
  })
  return JSON.stringify(obj);
}

async function getDemandFrames() {
  let wfDir = './assets/wf_montage_0.25';
  let workflow = Workflow.createFromFile(wfDir);
  let tracker = new WorkflowTracker(workflow);

  //// Optionals steps
  //let startTime = new Date().getTime();
  //tracker.notifyStart(startTime);
  //for (let sigId of [1,4,5,8,11,14,17,20,23,26,29,32,33,68,70,92,94]) {
  //  tracker.notifyInitialSignal(sigId, new Date().getTime());
  //}
  //for (let procId of [1,2,3,4,5,6,7,8,9,10,11,12,14]) {
  //  let randDelay = Math.floor(Math.random() * 500);
  //  await new Promise((res, rej) => { setTimeout(res, randDelay); });
  //  tracker.notifyProcessFinished(procId, new Date().getTime());
  //}

  let estimator = new StaticProcessEstimator();
  let plan = new Plan(workflow, tracker, 50000, estimator);
  plan.run();

  wfStart = tracker.getExecutionStartTime();

  //Logger.debug(mapToString(plan.getStateHistory()));
  let demandFrames = plan.getDemandFrames();
  Logger.debug(mapToString(demandFrames));
  return demandFrames;
}

async function test() {
  let demandFrames = await getDemandFrames();
  let machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
  let optimizer = new ScalingOptimizer(1, machineType, 10*1000, 50*1000, new GCPBillingModel());
  let bestDecision = optimizer.findBestDecision(wfStart || new Date().getTime(), demandFrames);
  Logger.debug('BEST DECISION: ' + bestDecision.getMachinesDiff().toString() + ' at ' + bestDecision.getTime().toString());
  Logger.debug("Done!");
}

if (require.main === module) {
  test();
}
