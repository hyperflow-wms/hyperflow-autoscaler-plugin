
import PredictPolicy from './predictPolicy';

import { GCPMachines, N1_HIGHCPU_4 } from "../cloud/gcpMachines";
import GCPBillingModel from '../cloud/gcpBillingModel';
import Workflow from "../hyperflow/tracker/workflow";
import WorkflowTracker from '../hyperflow/tracker/tracker';
import RR from '../kubernetes/resourceRequirements';

const expect = require('chai').expect;


describe('PredictPolicy object', function() {

  let wfDir = './assets/wf_montage-2mass_2.0';
  let workflow = Workflow.createFromFile(wfDir);
  let wfTracker = new WorkflowTracker(workflow);
  let startTime = new Date().getTime();
  //wfTracker.notifyStart(startTime);

  let billingModel = new GCPBillingModel()
  let machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
  process.env['HF_VAR_autoscalerEstimator'] = 'process';
  let policy = new PredictPolicy(wfTracker, billingModel, machineType);

  context('HEAVY INTEGRATION TEST - scaling descision', function() {
    it('know when to scale up', function() {
      let workerNodes = 1;
      let demand = new RR({cpu: "0", mem: "0"});
      let supply = new RR({cpu: "0", mem: "0"});
      let scalingDecision = policy.getDecision(demand, supply, workerNodes);
      expect(scalingDecision.getMachinesDiff()).to.greaterThan(0);
    });
  });
});
