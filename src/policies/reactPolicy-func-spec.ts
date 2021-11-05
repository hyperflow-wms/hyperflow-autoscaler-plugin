import ReactPolicy from './reactPolicy';

import { GCPMachines, N1_HIGHCPU_4 } from '../cloud/gcpMachines';
import GCPBillingModel from '../cloud/gcpBillingModel';
import Workflow from '../hyperflow/tracker/workflow';
import WorkflowTracker from '../hyperflow/tracker/tracker';
import RR from '../kubernetes/resourceRequirements';
import { expect } from 'chai';

describe('ReactPolicy object', function () {
  const wfDir = './assets/wf_montage_0.25';
  const workflow = Workflow.createFromFile(wfDir);
  const wfTracker = new WorkflowTracker(workflow);
  const startTime = new Date().getTime();
  wfTracker.notifyStart(startTime);

  const billingModel = new GCPBillingModel();
  const machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
  const policy = new ReactPolicy(wfTracker, billingModel, machineType);

  context('HEAVY INTEGRATION TEST - scaling descision', function () {
    it('know when to scale up', function () {
      const workerNodes = 1;
      const demand = new RR({ cpu: '99', mem: '20761804800' });
      const supply = new RR({ cpu: '3920m', mem: '2646306816' });
      const scalingDecision = policy.getDecision(demand, supply, workerNodes);
      // scaling up
      expect(scalingDecision.getMachinesDiff()).to.greaterThan(0);
      // scaling ASAP
      const timeNow = new Date().getTime();
      expect(scalingDecision.getTime() >= startTime).to.be.true;
      expect(scalingDecision.getTime() <= timeNow).to.be.true;
    });

    it('scale up when supply is too low', function () {
      const workerNodes = 3;
      const demand = new RR({ cpu: '41000m', mem: '10496Mi' });
      const supply = new RR({ cpu: '0', mem: '0' });
      const scalingDecision = policy.getDecision(demand, supply, workerNodes);
      expect(scalingDecision.getMachinesDiff()).to.greaterThan(0);
      expect(scalingDecision.getMachinesDiff()).to.equal(5);
    });

    it('scale down when supply is too high', function () {
      const workerNodes = 3;
      const demand = new RR({ cpu: '0.1', mem: '100M' });
      const supply = new RR({ cpu: '0', mem: '0' });
      const scalingDecision = policy.getDecision(demand, supply, workerNodes);
      expect(scalingDecision.getMachinesDiff()).to.equal(-2);
    });
  });
});
