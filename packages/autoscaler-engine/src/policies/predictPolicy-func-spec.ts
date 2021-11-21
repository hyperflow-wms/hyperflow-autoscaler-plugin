import { expect } from 'chai';
import GCPBillingModel from '../cloud/gcpBillingModel';
import { GCPMachines, N1_HIGHCPU_4 } from '../cloud/gcpMachines';
import WorkflowTracker from '../hyperflow/tracker/tracker';
import RR from '../kubernetes/resourceRequirements';
import { createWorkflowFromFile } from '../utils/testUtils';
import PredictPolicy from './predictPolicy';

describe('PredictPolicy object', function () {
  const wfDir = './assets/wf_montage-2mass_2.0';
  const workflow = createWorkflowFromFile(wfDir);
  const wfTracker = new WorkflowTracker(workflow);
  //wfTracker.notifyStart(startTime);

  const billingModel = new GCPBillingModel();
  const machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
  process.env['HF_VAR_autoscalerEstimator'] = 'process';
  const policy = new PredictPolicy(billingModel, machineType);
  policy.addWfTracker(wfTracker);

  context('HEAVY INTEGRATION TEST - scaling descision', function () {
    it('know when to scale up', function () {
      const workerNodes = 1;
      const demand = new RR({ cpu: '0', mem: '0' });
      const supply = new RR({ cpu: '0', mem: '0' });
      const scalingDecision = policy.getDecision(demand, supply, workerNodes);
      expect(scalingDecision.getMachinesDiff()).to.greaterThan(0);
    });
  });
});
