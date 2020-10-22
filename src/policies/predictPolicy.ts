import CooldownTracker from "../utils/cooldownTracker";
import { getBaseLogger } from '../utils/logger';
import Policy from "./policy";
import ResourceRequirements from "../kubernetes/resourceRequirements";
import ScalingDecision from "../hyperflow/workflow/scalingDecision";
import WorkflowTracker from "../hyperflow/tracker/tracker";
import ScalingOptimizer from "../hyperflow/workflow/scalingOptimizer";
import BillingModel from "../cloud/billingModel";
import MachineType from "../cloud/machine";
import StaticProcessEstimator from "../hyperflow/estimators/staticProcessEstimator";
import EstimatorInterface from "../hyperflow/estimators/estimatorInterface";
import Plan from "../hyperflow/workflow/plan";

const Logger = getBaseLogger();

type timestamp = number;

const SCALE_COOLDOWN_S = 10 * 60;
const PLAN_TIME_MS = 50 * 1000;

class PredictPolicy extends Policy
{
  private scaleCooldown: CooldownTracker;
  private estimator: EstimatorInterface;

  public constructor(wfTracker: WorkflowTracker, billingModel: BillingModel, machineType: MachineType) {
    super(wfTracker, billingModel, machineType);
    Logger.silly("[PredictPolicy] Constructor");
    this.scaleCooldown = new CooldownTracker();
    this.estimator = new StaticProcessEstimator();
  }

  /**
   * @inheritdoc
   */
  public getDecision(demand: ResourceRequirements, supply: ResourceRequirements, workers: number): ScalingDecision {
    /* Run planning to find future demand, then use scaling optimizer. */
    let plan = new Plan(this.wfTracker.getWorkflow(), this.wfTracker, PLAN_TIME_MS, this.estimator);
    plan.run();
    let demandFrames = plan.getDemandFrames();
    let timeNow = new Date();
    let optimizer = new ScalingOptimizer(workers, this.machineType, 0, 1, this.billingModel);
    let bestDecision = optimizer.findBestDecision(timeNow, demandFrames);
    return bestDecision;
  }

  /**
   * @inheritdoc
   */
  public isReady(action: ScalingDecision): boolean {
    let machinesDiff = action.getMachinesDiff();

    if (machinesDiff != 0 && this.scaleCooldown.isExpired() === false) {
      Logger.info("[ReactPolicy] Not ready due to cooldown");
      return false;
    }

    return true;
  }

  /**
   * @inheritdoc
   */
  public actionTaken(action: ScalingDecision): void {
    let machinesDiff = action.getMachinesDiff();
    if (machinesDiff != 0) {
      this.scaleCooldown.setNSeconds(SCALE_COOLDOWN_S);
    }

    return;
  }
}

export default PredictPolicy;
