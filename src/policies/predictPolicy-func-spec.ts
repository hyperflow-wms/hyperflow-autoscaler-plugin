import PredictPolicy from './predictPolicy';

import { GCPMachines, N1_HIGHCPU_4 } from '../cloud/gcpMachines';
import GCPBillingModel from '../cloud/gcpBillingModel';
import Workflow from '../hyperflow/tracker/workflow';
import WorkflowTracker from '../hyperflow/tracker/tracker';
import RR from '../kubernetes/resourceRequirements';
import { expect } from 'chai';

describe('PredictPolicy object', function () {
  const wfDir = './assets/wf_montage-2mass_2.0';
  const workflow = Workflow.createFromFile(wfDir);
  const wfTracker = new WorkflowTracker(workflow);
  //wfTracker.notifyStart(startTime);

  const billingModel = new GCPBillingModel();
  const machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
  process.env['HF_VAR_autoscalerEstimator'] = 'process';
  const policy = new PredictPolicy(wfTracker, billingModel, machineType);

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
