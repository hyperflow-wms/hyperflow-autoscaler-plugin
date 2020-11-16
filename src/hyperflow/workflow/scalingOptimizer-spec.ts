import GCPBillingModel from "../../cloud/gcpBillingModel";
import { GCPMachines, N1_HIGHCPU_4 } from "../../cloud/gcpMachines";
import ResourceRequirements from "../../kubernetes/resourceRequirements";
import StaticProcessEstimator from "../estimators/staticProcessEstimator";
import WorkflowTracker from "../tracker/tracker";
import Workflow from "../tracker/workflow";
import Plan from "./plan";
import ScalingOptimizer from "./scalingOptimizer";

const expect = require('chai').expect;

type timestamp = number;

let wfDir = './assets/wf_montage-2mass_2.0';
let workflow = Workflow.createFromFile(wfDir);

let wfTracker = new WorkflowTracker(workflow);
let maxPlanTimeMs: number = 300000;
let estimator = new StaticProcessEstimator();
let machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
let PROVISIONING_MACHINE_AVG_TIME = 120 * 1000;

describe('ScalingOptimizer class', function() {
  context('Score calculation', function() {
    // This is real life case
    it('increase score for less underutilization', function() {
      let optimizer = new ScalingOptimizer(3, GCPMachines.makeObject(N1_HIGHCPU_4), 0, 1, new GCPBillingModel());
      let demandBaseline = new Map<number, ResourceRequirements>();
      demandBaseline.set(1604480019066, new ResourceRequirements({cpu: "41000m", mem: "11005853696"}));
      let previousScore = -1;
      for (let n = -2; n <=5; n++) {
        let res = optimizer.calculateScalingResult(demandBaseline, 1604480019066, 1604480019067, n, 1604480019066);
        let score = res.getScore({skipOverProvision: true});
        expect(score).to.greaterThan(previousScore);
        previousScore = score;
      }
    });

    it('find optimal action for very heavy and long workload', function() {
      // prepare plan
      let beforePlanTime: timestamp = new Date().getTime();
      let plan = new Plan(workflow, wfTracker, maxPlanTimeMs, estimator);
      plan.run();
      let demandFrames = plan.getDemandFrames();

      // test optimizer for 1 worker
      let optimizerA = new ScalingOptimizer(1, machineType, PROVISIONING_MACHINE_AVG_TIME, maxPlanTimeMs, new GCPBillingModel());
      optimizerA.setScalingProbeTime(30000);
      let bestDecisionA = optimizerA.findBestDecision(beforePlanTime, demandFrames);
      expect(bestDecisionA.getMachinesDiff()).to.equal(7);

      // test optimizer for 8 workers
      let optimizerB = new ScalingOptimizer(8, machineType, PROVISIONING_MACHINE_AVG_TIME, maxPlanTimeMs, new GCPBillingModel());
      optimizerB.setScalingProbeTime(30000);
      let bestDecisionB = optimizerB.findBestDecision(beforePlanTime, demandFrames);
      expect(bestDecisionB.getMachinesDiff()).to.equal(0);
    });
  });
});
