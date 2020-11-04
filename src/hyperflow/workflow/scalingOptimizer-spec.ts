
import GCPBillingModel from '../../cloud/gcpBillingModel';
import { GCPMachines, N1_HIGHCPU_4 } from '../../cloud/gcpMachines';
import ResourceRequirements from '../../kubernetes/resourceRequirements';
import ScalingOptimizer from './scalingOptimizer';

const expect = require('chai').expect;

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
        console.log(score);
      }
    });
  });
});
