
import { N1_HIGHCPU_2, N1_HIGHCPU_4, N1_HIGHCPU_8, N1_HIGHCPU_16, N1_HIGHCPU_32, N1_HIGHCPU_64, N1_HIGHCPU_96, GCPMachines } from './gcpMachines';
import MachineType from './machine';
const expect = require('chai').expect;

describe('GCPMachines class', function() {
  context('VM knowledge', function() {
    it('can create object from machine name', function() {
      expect(GCPMachines.makeObject(N1_HIGHCPU_2) instanceof MachineType).to.be.true;
      expect(GCPMachines.makeObject(N1_HIGHCPU_4) instanceof MachineType).to.be.true;
      expect(GCPMachines.makeObject(N1_HIGHCPU_8) instanceof MachineType).to.be.true;
      expect(GCPMachines.makeObject(N1_HIGHCPU_16) instanceof MachineType).to.be.true;
      expect(GCPMachines.makeObject(N1_HIGHCPU_32) instanceof MachineType).to.be.true;
      expect(GCPMachines.makeObject(N1_HIGHCPU_64) instanceof MachineType).to.be.true;
      expect(GCPMachines.makeObject(N1_HIGHCPU_96) instanceof MachineType).to.be.true;
    });

    it('throw error for unknown machines', function() {
      expect(() => { GCPMachines.makeObject("foo"); }).to.throw(Error);
      expect(() => { GCPMachines.makeObject("bar"); }).to.throw(Error);
    });
  });
});
