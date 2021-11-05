import BillingModel from '../cloud/billingModel';
import MachineType from '../cloud/machine';
import WorkflowTracker from '../hyperflow/tracker/tracker';
import ScalingDecision from '../hyperflow/workflow/scalingDecision';
import ResourceRequirements from '../kubernetes/resourceRequirements';

abstract class Policy {
  protected wfTracker: WorkflowTracker;
  protected billingModel: BillingModel;
  protected machineType: MachineType;

  public constructor(
    wfTracker: WorkflowTracker,
    billingModel: BillingModel,
    machineType: MachineType
  ) {
    this.wfTracker = wfTracker;
    this.billingModel = billingModel;
    this.machineType = machineType;
  }

  /**
   * Gets proposed scaling decision according to policy.
   *
   * @param demand total cluster demand
   * @param supply total cluster supply
   * @param workers number of worker nodes
   */
  public abstract getDecision(
    demand: ResourceRequirements,
    supply: ResourceRequirements,
    workers: number
  ): ScalingDecision;

  /**
   * Whether scaling action is valid with current policy terms.
   * This is especially useful for respecting cooldown timers.
   *
   * @param action
   */
  public abstract isReady(action: ScalingDecision): boolean;

  /**
   * Used to inform policy about taken action.
   * Imporant: Engine's scaling decision may be little different than
   * returned in getDecision - especially in case of time.
   * @param action
   */
  public abstract actionTaken(action: ScalingDecision): void;
}

export default Policy;
