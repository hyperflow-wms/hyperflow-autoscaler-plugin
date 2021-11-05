import GCPBillingModel from '../../cloud/gcpBillingModel';
import { GCPMachines, N1_HIGHCPU_4 } from '../../cloud/gcpMachines';
import ResourceRequirements from '../../kubernetes/resourceRequirements';
import StaticProcessEstimator from '../estimators/staticProcessEstimator';
import WorkflowTracker from '../tracker/tracker';
import Workflow from '../tracker/workflow';
import Plan from './plan';
import ScalingOptimizer from './scalingOptimizer';
import { expect } from 'chai';

type timestamp = number;

const wfDir = './assets/wf_montage-2mass_2.0';
const workflow = Workflow.createFromFile(wfDir);

const wfTracker = new WorkflowTracker(workflow);
const maxPlanTimeMs = 300000;
const estimator = new StaticProcessEstimator();
const machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
const PROVISIONING_MACHINE_AVG_TIME = 120 * 1000;

describe('ScalingOptimizer class', function () {
  context('Score calculation', function () {
    // This is real life case
    it('increase score for less underutilization', function () {
      const optimizer = new ScalingOptimizer(
        3,
        GCPMachines.makeObject(N1_HIGHCPU_4),
        0,
        1,
        new GCPBillingModel()
      );
      const demandBaseline = new Map<number, ResourceRequirements>();
      demandBaseline.set(
        1604480019066,
        new ResourceRequirements({ cpu: '41000m', mem: '11005853696' })
      );
      let previousScore = -1;
      for (let n = -2; n <= 5; n++) {
        const res = optimizer.calculateScalingResult(
          demandBaseline,
          1604480019066,
          1604480019067,
          n,
          1604480019066
        );
        const score = res.getScore({ skipOverProvision: true });
        expect(score).to.greaterThan(previousScore);
        previousScore = score;
      }
    });

    it('find optimal action for very heavy and long workload', function () {
      // prepare plan
      const beforePlanTime: timestamp = new Date().getTime();
      const plan = new Plan(workflow, wfTracker, maxPlanTimeMs, estimator);
      plan.run();
      const demandFrames = plan.getDemandFrames();

      // test optimizer for 1 worker
      const optimizerA = new ScalingOptimizer(
        1,
        machineType,
        PROVISIONING_MACHINE_AVG_TIME,
        maxPlanTimeMs,
        new GCPBillingModel()
      );
      optimizerA.setScalingProbeTime(30000);
      const bestDecisionA = optimizerA.findBestDecision(
        beforePlanTime,
        demandFrames
      );
      expect(bestDecisionA.getMachinesDiff()).to.equal(7);

      // test optimizer for 8 workers
      const optimizerB = new ScalingOptimizer(
        8,
        machineType,
        PROVISIONING_MACHINE_AVG_TIME,
        maxPlanTimeMs,
        new GCPBillingModel()
      );
      optimizerB.setScalingProbeTime(30000);
      const bestDecisionB = optimizerB.findBestDecision(
        beforePlanTime,
        demandFrames
      );
      expect(bestDecisionB.getMachinesDiff()).to.equal(0);
    });
  });
});
