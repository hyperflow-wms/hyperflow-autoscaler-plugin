import { MachineSpec } from "../../cloud/gcp_machines";
import ResourceRequirements from "../../kubernetes/resourceRequirements";

const SCALING_PROBE_TIME_MS = 100;
const MAX_MACHINES = 8;

interface ScalingResult {
  price: number
  cpuUndeprovision: number;
  cpuOverprovision: number;
  memUndeprovision: number;
  memOverprovision: number;
}

class ScalingOptimizer
{
  private runningMachines: number;
  private machineType: MachineSpec;
  private provisioningTimeMs: number;
  private analyzedTimeMs: number;

  constructor(runningMachines: number, machineType: MachineSpec, provisioningTimeMs: number, analyzedTimeMs: number) {
    this.runningMachines = runningMachines;
    this.machineType = machineType;
    this.provisioningTimeMs = provisioningTimeMs;
    this.analyzedTimeMs = analyzedTimeMs;
  }

  getEqualFrames(demandFrames: Map<number, ResourceRequirements>, startTime: number, endTime: number): Map<number, ResourceRequirements> {
    /* Base equal frames - but not propagated and not averaged. */
    let demandIterator = demandFrames.entries();
    let currentRes: IteratorResult<[number, ResourceRequirements], any> | undefined;
    let equalFrames = new Map<number, ResourceRequirements[]>();
    for (let currentTime = startTime; currentTime < endTime; currentTime += SCALING_PROBE_TIME_MS) {
      equalFrames.set(currentTime, []);
      let currentFrame = equalFrames.get(currentTime);
      if (currentFrame === undefined) {
        throw Error('Fatal error');
      }
      while (true) {
        if (currentRes === undefined) {
          currentRes = demandIterator.next();
          if (currentRes.done == true) {
            currentRes = undefined;
            break;
          }
        }
        let element: [number, ResourceRequirements] = currentRes.value;
        let time = element[0];
        let demand = element[1];
        if (time < currentTime || time >= (currentTime + SCALING_PROBE_TIME_MS)) {
          break;
        }
        currentFrame.push(demand); // TODO we should use prev. element...
        currentRes = undefined;
      }
    }

    /* Propagate demands over frames + use average when they are multiple of them. */
    let superEqualFrames = new Map<number, ResourceRequirements>();
    let lastDemand: ResourceRequirements = new ResourceRequirements({cpu: "0", mem: "0"});
    equalFrames.forEach((demandArr, timeKeyMs) => {
      if (demandArr.length > 0) {
        let currentAvgDemand = ResourceRequirements.Utils.getAverage(demandArr);
        lastDemand = currentAvgDemand;
      }
      superEqualFrames.set(timeKeyMs, lastDemand);
    });

    return superEqualFrames;
  }

  calculateScalingResult(baseEqualSupply: Map<number, ResourceRequirements>, startTimeMs: number, maxTimeMs: number, machinesDiff: number, scalingTime: number): ScalingResult {
    console.log("Analyzing result of scaling ", Math.abs(machinesDiff), "machines", ((machinesDiff >= 0) ? "up" : "down"), "at", scalingTime);
    /* Calculate total price. */
    let timeUnscaledMs = scalingTime - startTimeMs;
    let timeScaledMs = maxTimeMs - scalingTime;
    let machinesUnscaled = this.runningMachines;
    let machinesScaled = this.runningMachines + machinesDiff;
    let hourlyPrice = this.machineType.price;
    let priceUnscaled = timeUnscaledMs * machinesUnscaled * hourlyPrice / 60 / 60 / 1000;
    let priceScaled = timeScaledMs * machinesScaled * hourlyPrice / 60 / 60 / 1000;
    let totalPrice = priceUnscaled + priceScaled;

    /* Calculate total under/overprovision. */
    let cpuSupplyBeforeScaling = machinesUnscaled * this.machineType.cpu;
    let cpuSupplyAfterScaling = machinesScaled * this.machineType.cpu;
    let memSupplyBeforeScaling = machinesUnscaled * this.machineType.mem;
    let memSupplyAfterScaling = machinesScaled * this.machineType.mem;
    let totalCpuUndeprovision = 0;
    let totalCpuOverprovision = 0;
    let totalMemUndeprovision = 0;
    let totalMemOverprovision = 0;
    let timeScaledAndReadyMs = scalingTime + this.provisioningTimeMs;
    baseEqualSupply.forEach((demand, timeKeyMs) => {
      let currentCpuSupply: number;
      let currentMemSupply: number;
      if (timeKeyMs >= timeScaledAndReadyMs) {
        currentCpuSupply = cpuSupplyAfterScaling;
        currentMemSupply = memSupplyAfterScaling;
      } else {
        currentCpuSupply = cpuSupplyBeforeScaling;
        currentMemSupply = memSupplyBeforeScaling;
      }
      if (currentCpuSupply < demand.getCpuMillis()) {
        totalCpuUndeprovision += (demand.getCpuMillis() - currentCpuSupply);
      } else {
        totalCpuOverprovision += (currentCpuSupply - demand.getCpuMillis());
      }
      if (currentMemSupply < demand.getMemBytes()) {
        totalMemUndeprovision += (demand.getMemBytes() - currentMemSupply);
      } else {
        totalMemUndeprovision += (currentMemSupply - demand.getMemBytes());
      }
    });

    let result: ScalingResult = {
      "price": totalPrice,
      "cpuUndeprovision": totalCpuUndeprovision,
      "cpuOverprovision": totalCpuOverprovision,
      "memUndeprovision": totalMemUndeprovision,
      "memOverprovision": totalMemOverprovision,
    }
    console.log(result);
    return result;
  }

  findBestDecision(startTime: Date, demandFrames: Map<number, ResourceRequirements>): void {
    let startTimeMs = startTime.getTime();
    let maxTimeMs = startTimeMs + this.analyzedTimeMs;

    /* Get average supply over equal time frames - this is our baseline for calculations. */
    let baseEqualSupply = this.getEqualFrames(demandFrames, startTimeMs, maxTimeMs);

    /* Get space of possible machines, there must at least 1 running,
     * and we cannot exceed our provider's quota. */
    let possbileLessMachines = this.runningMachines - 1;
    let possibleMoreMachines = MAX_MACHINES - this.runningMachines;

    /* Get the result of no scaling at all - our baseline for comparing actions. */
    let bestScalingMachines = 0;
    let bestScalingTime = startTimeMs;
    let scalingRes = this.calculateScalingResult(baseEqualSupply, startTimeMs, maxTimeMs, bestScalingMachines, bestScalingTime);
    let bestScalingPrice = scalingRes.price;
    let bestScalingCpuUnderpovision = scalingRes.cpuUndeprovision;
    let bestScalingCpuOverprovision = scalingRes.cpuOverprovision;
    let bestScalingMemUnderpovision = scalingRes.memUndeprovision;
    let bestScalingMemOverprovision = scalingRes.memOverprovision;

    /* Try every possible scaling decision at given probe interval,
     * and find best option in terms of under/overprovisioning. */
    for (let t = startTimeMs; t < maxTimeMs; t += SCALING_PROBE_TIME_MS) {
      for (let n = (possbileLessMachines*(-1)); n < possibleMoreMachines; n++) {
        /* No-scaling action was already calculated. */
        if (n == 0) {
          continue;
        }
        let scalingRes2 = this.calculateScalingResult(baseEqualSupply, startTimeMs, maxTimeMs, n, t);

        //let K = 0; //TODO
        //let C = 0; // TODO
      }
    }


    return;
  }

}

export default ScalingOptimizer;




import { n1_highcpu_4 } from "../../cloud/gcp_machines";
import StaticEstimator from "../estimators/staticEstimator";
import WorkflowTracker from "../tracker/tracker";
import Workflow from "../tracker/workflow";
import Plan from "./plan";

let wfStart: Date | undefined;

async function getDemandFrames() {
  let wfDir = '/home/andrew/Projects/master-thesis/hyperflow/autoscaler/assets/wf_example';
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
  let optimizer = new ScalingOptimizer(1, n1_highcpu_4, 10*1000, 50*1000);
  optimizer.findBestDecision(wfStart || new Date(), demandFrames);
}

test();
