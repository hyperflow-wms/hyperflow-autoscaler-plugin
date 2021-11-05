import CooldownTracker from '../utils/cooldownTracker';
import { getBaseLogger } from '../utils/logger';
import Policy from './policy';
import ResourceRequirements from '../kubernetes/resourceRequirements';
import ScalingDecision from '../hyperflow/workflow/scalingDecision';
import WorkflowTracker from '../hyperflow/tracker/tracker';
import ScalingOptimizer from '../hyperflow/workflow/scalingOptimizer';
import BillingModel from '../cloud/billingModel';
import MachineType from '../cloud/machine';
import StaticProcessEstimator from '../hyperflow/estimators/staticProcessEstimator';
import EstimatorInterface from '../hyperflow/estimators/estimatorInterface';
import Plan from '../hyperflow/workflow/plan';
import StaticWorkflowEstimator from '../hyperflow/estimators/staticWorkflowEstimator';

const Logger = getBaseLogger();

type timestamp = number;

const SCALE_COOLDOWN_S = 4 * 60;
const PROVISIONING_MACHINE_AVG_TIME = 120 * 1000;

class PredictPolicy extends Policy {
  private scaleCooldown: CooldownTracker;
  private estimator: EstimatorInterface;

  private planTimeMs: number;

  public constructor(
    wfTracker: WorkflowTracker,
    billingModel: BillingModel,
    machineType: MachineType
  ) {
    super(wfTracker, billingModel, machineType);
    Logger.trace('[PredictPolicy] Constructor');
    this.scaleCooldown = new CooldownTracker();
    const estimatorName = process.env['HF_VAR_autoscalerEstimator'];
    if (estimatorName == 'process') {
      this.estimator = new StaticProcessEstimator();
    } else if (estimatorName == 'workflow') {
      this.estimator = new StaticWorkflowEstimator();
    } else {
      throw Error(
        "No valid estimator specified. Hint: use environmental vairable 'HF_VAR_autoscalerEstimator'."
      );
    }

    this.planTimeMs = 5 * 60 * 1000; // 5 minutes default
    const planTimeMs = parseInt(
      process.env['HF_VAR_autoscalerPredictTime'] || 'none'
    );
    if (isNaN(planTimeMs) == false) {
      this.planTimeMs = planTimeMs;
    }
  }

  /**
   * @inheritdoc
   */
  public getDecision(
    demand: ResourceRequirements,
    supply: ResourceRequirements,
    workers: number
  ): ScalingDecision {
    /* Run planning to find future demand, then use scaling optimizer.
     * We use a copy of wfTracker to avoid messing up original one.
     * Current time must be saved BEFORE running plan, to make sure all
     * events are analyzed by optimizer. */
    const getDecisionTime: timestamp = new Date().getTime();
    const wfTrackerCopy = new WorkflowTracker(this.wfTracker);
    const plan = new Plan(
      this.wfTracker.getWorkflow(),
      wfTrackerCopy,
      this.planTimeMs,
      this.estimator
    );
    plan.run();
    const demandFrames = plan.getDemandFrames();
    Logger.debug(
      '[PredictPolicy] Running scaling optimizer (workers: ' +
        workers.toString() +
        'x ' +
        this.machineType.getName() +
        ', plan time:' +
        this.planTimeMs.toString()
    );
    const optimizer = new ScalingOptimizer(
      workers,
      this.machineType,
      PROVISIONING_MACHINE_AVG_TIME,
      this.planTimeMs,
      this.billingModel
    );
    const bestDecision = optimizer.findBestDecision(
      getDecisionTime,
      demandFrames
    );
    return bestDecision;
  }

  /**
   * @inheritdoc
   */
  public isReady(action: ScalingDecision): boolean {
    const machinesDiff = action.getMachinesDiff();

    if (machinesDiff != 0 && this.scaleCooldown.isExpired() === false) {
      Logger.info('[PredictPolicy] Not ready due to cooldown');
      return false;
    }

    return true;
  }

  /**
   * @inheritdoc
   */
  public actionTaken(action: ScalingDecision): void {
    const machinesDiff = action.getMachinesDiff();
    if (machinesDiff != 0) {
      this.scaleCooldown.setNSeconds(SCALE_COOLDOWN_S);
    }

    return;
  }
}

export default PredictPolicy;
