import CooldownTracker from '../utils/cooldownTracker';
import { getBaseLogger } from '@hyperflow/logger';
import Policy from './policy';
import ResourceRequirements from '../kubernetes/resourceRequirements';
import ScalingDecision from '../hyperflow/workflow/scalingDecision';
import ScalingOptimizer from '../hyperflow/workflow/scalingOptimizer';
import BillingModel from '../cloud/billingModel';
import MachineType from '../cloud/machine';

const Logger = getBaseLogger();

type timestamp = number;

// Percent of utilization is not used - we use scoring
//const SCALE_UP_UTILIZATION = 0.9;
//const SCALE_DOWN_UTILIZATION = 0.5;

const SCALE_UP_COOLDOWN_S = 3 * 60;
const SCALE_DOWN_COOLDOWN_S = 3 * 60;

class ReactPolicy extends Policy {
  private scaleUpCooldown: CooldownTracker;
  private scaleDownCooldown: CooldownTracker;

  public constructor(billingModel: BillingModel, machineType: MachineType) {
    super(billingModel, machineType);
    Logger.trace('[ReactPolicy] Constructor');
    this.scaleUpCooldown = new CooldownTracker();
    this.scaleDownCooldown = new CooldownTracker();
  }

  /**
   * @inheritdoc
   */
  public getDecision(
    demand: ResourceRequirements,
    supply: ResourceRequirements,
    workers: number
  ): ScalingDecision {
    /* We use ScalingOptimizer in a smart way: with single
     * mocked demand frame, 0 ms bootstraping time because
     * we only care about current cluster state.
     * 10 minutes is analyzed because we want to avoid 'in advance'
     * paying in price calcuation.
     *
     * skipOverProvision is set, because we care only about providing
     * enough space, without caring about budget - that is similar
     * behavior to Kubernetes Autoscaler.
     *
     * CAUTION: supply is simply ignored, because we have number of workers
     * and their specifications - TODO think about removing it. */
    const demandFrames = new Map<timestamp, ResourceRequirements[]>();
    const getDecisionTime: timestamp = new Date().getTime();
    demandFrames.set(getDecisionTime, [demand]);
    Logger.debug(
      '[ReactPolicy] Running scaling optimizer (workers: ' +
        workers.toString() +
        'x ' +
        this.machineType.getName() +
        ', demand:' +
        demand.toString()
    );
    const analyzeTimeMs = 10 * 60 * 1000; // 10 min.
    const optimizer = new ScalingOptimizer(
      workers,
      this.machineType,
      0,
      analyzeTimeMs,
      this.billingModel
    );
    optimizer.setScalingProbeTime(analyzeTimeMs);
    optimizer.setScoreOptions({ skipOverProvision: true });
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

    if (machinesDiff > 0 && this.scaleUpCooldown.isExpired() === false) {
      Logger.info('[ReactPolicy] Not ready due to up-cooldown');
      return false;
    }

    if (machinesDiff < 0 && this.scaleDownCooldown.isExpired() === false) {
      Logger.info('[ReactPolicy] Not ready due to down-cooldown');
      return false;
    }

    return true;
  }

  /**
   * @inheritdoc
   */
  public actionTaken(action: ScalingDecision): void {
    const machinesDiff = action.getMachinesDiff();

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
