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
import StaticWorkflowEstimator from "../hyperflow/estimators/staticWorkflowEstimator";

const Logger = getBaseLogger();

type timestamp = number;

const SCALE_COOLDOWN_S = 10 * 60;
const PROVISIONING_MACHINE_AVG_TIME = 120 * 1000;

class PredictPolicy extends Policy
{
  private scaleCooldown: CooldownTracker;
  private estimator: EstimatorInterface;

  private planTimeMs: number;

  public constructor(wfTracker: WorkflowTracker, billingModel: BillingModel, machineType: MachineType) {
    super(wfTracker, billingModel, machineType);
    Logger.silly("[PredictPolicy] Constructor");
    this.scaleCooldown = new CooldownTracker();
    let estimatorName = process.env['HF_VAR_autoscalerEstimator'];
    if (estimatorName == "process") {
      this.estimator = new StaticProcessEstimator();
    } else if (estimatorName == "workflow") {
      this.estimator = new StaticWorkflowEstimator();
    } else {
      throw Error("No valid estimator specified. Hint: use environmental vairable 'HF_VAR_autoscalerEstimator'.")
    }

    this.planTimeMs = 5*60*1000; // 5 minutes default
    let planTimeMs = parseInt(process.env['HF_VAR_autoscalerPredictTime'] || "none");
    if (isNaN(planTimeMs) == false) {
      this.planTimeMs = planTimeMs;
    }
  }

  /**
   * @inheritdoc
   */
  public getDecision(demand: ResourceRequirements, supply: ResourceRequirements, workers: number): ScalingDecision {
    /* Run planning to find future demand, then use scaling optimizer.
     * We use a copy of wfTracker to avoid messing up original one. */
    let wfTrackerCopy = new WorkflowTracker(this.wfTracker);
    let plan = new Plan(this.wfTracker.getWorkflow(), wfTrackerCopy, this.planTimeMs, this.estimator);
    plan.run();
    let demandFrames = plan.getDemandFrames();
    let msNow: timestamp = new Date().getTime();
    let optimizer = new ScalingOptimizer(workers, this.machineType, PROVISIONING_MACHINE_AVG_TIME, this.planTimeMs, this.billingModel);
    let bestDecision = optimizer.findBestDecision(msNow, demandFrames);
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
