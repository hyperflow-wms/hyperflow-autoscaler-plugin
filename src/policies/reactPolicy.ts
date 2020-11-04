import CooldownTracker from "../utils/cooldownTracker";
import { getBaseLogger } from '../utils/logger';
import Policy from "./policy";
import ResourceRequirements from "../kubernetes/resourceRequirements";
import ScalingDecision from "../hyperflow/workflow/scalingDecision";
import WorkflowTracker from "../hyperflow/tracker/tracker";
import ScalingOptimizer from "../hyperflow/workflow/scalingOptimizer";
import BillingModel from "../cloud/billingModel";
import MachineType from "../cloud/machine";

const Logger = getBaseLogger();

type timestamp = number;

// Percent of utilization is not used - we use scoring
//const SCALE_UP_UTILIZATION = 0.9;
//const SCALE_DOWN_UTILIZATION = 0.5;

const SCALE_UP_COOLDOWN_S = 3 * 60;
const SCALE_DOWN_COOLDOWN_S = 3 * 60;

class ReactPolicy extends Policy
{
  private scaleUpCooldown: CooldownTracker;
  private scaleDownCooldown: CooldownTracker;

  public constructor(wfTracker: WorkflowTracker, billingModel: BillingModel, machineType: MachineType) {
    super(wfTracker, billingModel, machineType);
    Logger.silly("[ReactPolicy] Constructor");
    this.scaleUpCooldown = new CooldownTracker();
    this.scaleDownCooldown = new CooldownTracker();
  }

  /**
   * @inheritdoc
   */
  public getDecision(demand: ResourceRequirements, supply: ResourceRequirements, workers: number): ScalingDecision {
    /* We use ScalingOptimizer in a smart way: with single
     * mocked demand frame, 0 ms bootstraping time and 1 ms
     * analysis - because we only care about current cluster state.
     *
     * CAUTION: supply is simply ignored, because we have number of workers
     * and their specifications - TODO think about removing it. */
    let demandFrames = new Map<timestamp, ResourceRequirements[]>();
    let msNow: timestamp = new Date().getTime();
    demandFrames.set(msNow, [demand]);
    Logger.debug("[ReactPolicy] Running scaling optimizer (workers: " + workers.toString() + "x " + this.machineType.getName() + ", demand:" + demand.toString())
    let optimizer = new ScalingOptimizer(workers, this.machineType, 0, 1, this.billingModel);
    let bestDecision = optimizer.findBestDecision(msNow, demandFrames);
    return bestDecision;
  }

  /**
   * @inheritdoc
   */
  public isReady(action: ScalingDecision): boolean {
    let machinesDiff = action.getMachinesDiff();

    if (machinesDiff > 0 && this.scaleUpCooldown.isExpired() === false) {
      Logger.info("[ReactPolicy] Not ready due to up-cooldown");
      return false;
    }

    if (machinesDiff < 0 && this.scaleDownCooldown.isExpired() === false) {
      Logger.info("[ReactPolicy] Not ready due to down-cooldown");
      return false;
    }

    return true;
  }

  /**
   * @inheritdoc
   */
  public actionTaken(action: ScalingDecision): void {
    let machinesDiff = action.getMachinesDiff();

    if (machinesDiff > 0) {
      this.scaleUpCooldown.setNSeconds(SCALE_UP_COOLDOWN_S);
    }

    if (machinesDiff < 0) {
      this.scaleDownCooldown.setNSeconds(SCALE_DOWN_COOLDOWN_S);
    }

    return;
  }
}

export default ReactPolicy;
