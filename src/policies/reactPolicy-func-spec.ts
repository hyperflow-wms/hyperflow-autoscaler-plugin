
import ReactPolicy from './reactPolicy';

import { GCPMachines, N1_HIGHCPU_4 } from "../cloud/gcpMachines";
import GCPBillingModel from '../cloud/gcpBillingModel';
import Workflow from "../hyperflow/tracker/workflow";
import WorkflowTracker from '../hyperflow/tracker/tracker';
import RR from '../kubernetes/resourceRequirements';

const expect = require('chai').expect;


describe('ReactPolicy object', function() {

  let wfDir = './assets/wf_example';
  let workflow = Workflow.createFromFile(wfDir);
  let wfTracker = new WorkflowTracker(workflow);
  let startTime = new Date();
  wfTracker.notifyStart(startTime);

  let billingModel = new GCPBillingModel()
  let machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
  let policy = new ReactPolicy(wfTracker, billingModel, machineType);

  context('HEAVY INTEGRATION TEST - scaling descision', function() {
    it('know when to scale up', function() {
      let workerNodes = 1;
      let demand = new RR({cpu: "99", mem: "20761804800"});
      let supply = new RR({cpu: "3920m", mem: "2646306816"});
      let scalingDecision = policy.getDecision(demand, supply, workerNodes);
      // scaling up
      expect(scalingDecision.getMachinesDiff()).to.greaterThan(0);
      // scaling ASAP
      let timeNow = new Date();
      expect(scalingDecision.getTime() >= startTime.getTime()).to.be.true;
      expect(scalingDecision.getTime() <= timeNow.getTime()).to.be.true;
    });
  });
});