/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBaseLogger } from '@hyperflow/logger';
import ResourceRequirements from '../../kubernetes/resourceRequirements';
import Timeframe from '../../utils/timeframe';
import { ScalingResult, ScoreOptions } from './scalingResult';

const Logger = getBaseLogger();

const DEFAULT_SCALING_PROBE_TIME_MS = 10000; // 10 seconds scaling precision is completely enough
const MAX_MACHINES = 8;

type timestamp = number;
type milliseconds = number;

class ScalingOptimizer {
  private runningMachines: number;
  private machineType: MachineType;
  private provisioningTimeMs: number;
  private analyzedTimeMs: number;
  private billingModel: BillingModel;
  private scoreOptions: ScoreOptions;
  private scalingProbeTime: milliseconds;

  constructor(
    runningMachines: number,
    machineType: MachineType,
    provisioningTimeMs: number,
    analyzedTimeMs: number,
    billingModel: BillingModel
  ) {
    this.runningMachines = runningMachines;
    this.machineType = machineType;
    this.provisioningTimeMs = provisioningTimeMs;
    this.analyzedTimeMs = analyzedTimeMs;
    this.billingModel = billingModel;
    this.scoreOptions = { skipOverProvision: false };
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
  getDemandBaseline(
    demandFrames: Map<timestamp, ResourceRequirements[]>,
    startTime: timestamp,
    endTime: timestamp,
    interval: milliseconds
  ): Map<timestamp, ResourceRequirements> {
    const equalizedData = Timeframe.packEqualIntervals(
      demandFrames,
      startTime,
      endTime,
      interval
    );
    const filledData: Map<timestamp, ResourceRequirements[]> =
      Timeframe.fillArrayGapsWithLast(equalizedData);
    const baseLine: Map<timestamp, ResourceRequirements> = new Map();
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
  calculateScalingResult(
    demandBaseline: Map<number, ResourceRequirements>,
    startTime: timestamp,
    endTime: timestamp,
    machinesDiff: number,
    scalingTime: timestamp
  ): ScalingResult {
    //Logger.debug("Analyzing result of scaling " + Math.abs(machinesDiff).toString() + " machines " + ((machinesDiff >= 0) ? "up" : "down") + " at " + scalingTime.toString());
    const scalingResult = new ScalingResult();

    /* Calculate total price. */
    const machinesUnscaled = this.runningMachines;
    const machinesScaled = this.runningMachines + machinesDiff;
    const totalPrice = this.billingModel.getPriceForDynamicInterval(
      this.machineType,
      startTime,
      machinesUnscaled,
      scalingTime,
      machinesScaled,
      endTime
    );
    scalingResult.setPrice(totalPrice);

    /* Calculate total score (based on under/overprovision). */
    const supplyBeforeScaling = new ResourceRequirements({
      cpu:
        (machinesUnscaled * this.machineType.getCpuMillis()).toString() + 'm',
      mem: (machinesUnscaled * this.machineType.getMemBytes()).toString()
    });
    const supplyAfterScaling = new ResourceRequirements({
      cpu: (machinesScaled * this.machineType.getCpuMillis()).toString() + 'm',
      mem: (machinesScaled * this.machineType.getMemBytes()).toString()
    });

    /* If scaling up, then we have to wait some time until nodes are ready.
     * When scaling down, we can consider it as immediate action. */
    let timeScaledAndReadyMs: number;
    if (machinesDiff > 0) {
      timeScaledAndReadyMs = scalingTime + this.provisioningTimeMs;
    } else {
      timeScaledAndReadyMs = scalingTime;
    }

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
  findBestDecision(
    startTimeMs: timestamp,
    demandFrames: Map<number, ResourceRequirements[]>
  ): ScalingDecision {
    /* Get average supply over equal time frames - this is our baseline for calculations. */
    const maxTimeMs = startTimeMs + this.analyzedTimeMs;
    const demandBaseline = this.getDemandBaseline(
      demandFrames,
      startTimeMs,
      maxTimeMs,
      this.scalingProbeTime
    );

    /* Get space of possible machines, there must at least 1 running,
     * and we cannot exceed our provider's quota. */
    const possbileLessMachines = this.runningMachines - 1;
    const possibleMoreMachines = MAX_MACHINES - this.runningMachines;

    /* Get the result of NO scaling at all - our base for comparing actions. */
    let bestScalingDecision = new ScalingDecision(0, startTimeMs);
    let scalingRes = this.calculateScalingResult(
      demandBaseline,
      startTimeMs,
      maxTimeMs,
      bestScalingDecision.getMachinesDiff(),
      bestScalingDecision.getTime()
    );
    let bestScalingPrice = scalingRes.getPrice();
    let bestScalingScore = scalingRes.getScore(this.scoreOptions);
    //Logger.debug('Scaling res for no action at ' + startTimeMs.toString() + ': ' + scalingRes.getPrice().toString() + '$, score ' + scalingRes.getScore({}).toString());

    /* Try every possible scaling decision at given probe interval,
     * and find best option.
     * TODO: we should limit loop max time to reactInterval, further analysis is not necessary. */
    for (let t = startTimeMs; t < maxTimeMs; t += this.scalingProbeTime) {
      for (let n = possbileLessMachines * -1; n <= possibleMoreMachines; n++) {
        /* No-scaling action was already calculated. */
        if (n == 0) {
          continue;
        }
        /* Calculate result; update best one if we get higher score, or same with less price. */
        scalingRes = this.calculateScalingResult(
          demandBaseline,
          startTimeMs,
          maxTimeMs,
          n,
          t
        );
        const scalingPrice = scalingRes.getPrice(); // 'C' in math equation
        const scalingScore = scalingRes.getScore(this.scoreOptions);

        /* Debug logging for scaling at first time frame. */
        if (t == startTimeMs) {
          Logger.debug(
            '[ScalingOptimizer] Scaling result for ' +
              (n.toString().padStart(3, ' ') +
                ' machines at ' +
                t.toString() +
                ': ' +
                scalingRes.getPrice().toString().padStart(12, ' ') +
                ' $, score ' +
                scalingRes.getScore({}).toFixed(6).toString().padStart(8, ' '))
          );
        }

        /* Ignore all solutions where we get strictly lower score. */
        if (scalingScore < bestScalingScore) {
          continue;
        }

        /* Handle case when we reached same score (eg. Infinity),
         * but we might get lower price. */
        if (
          scalingScore == bestScalingScore &&
          scalingPrice >= bestScalingPrice
        ) {
          continue;
        }

        bestScalingDecision = new ScalingDecision(n, t);
        bestScalingPrice = scalingPrice;
        bestScalingScore = scalingScore;
      }
    }
    Logger.debug(
      '[ScalingOptimizer] Best descision found: ' +
        bestScalingDecision.getMachinesDiff().toString() +
        ' at ' +
        bestScalingDecision.getTime().toString() +
        ' with score ' +
        bestScalingScore.toString()
    );

    return bestScalingDecision;
  }
}

export default ScalingOptimizer;

import MachineType from '../../cloud/machine';
import BillingModel from '../../cloud/billingModel';
import ScalingDecision from './scalingDecision';
