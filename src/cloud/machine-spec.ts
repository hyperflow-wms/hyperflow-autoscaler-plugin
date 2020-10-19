import MachineType from "./machine";

const expect = require('chai').expect;

describe('Machine object', function() {
  context('Constructor and getters', function() {
    it('allow to create object from properties', function() {
      expect(new MachineType({name: "machineA", cpu: "0", memory: "0"}) instanceof MachineType).to.be.true;
      expect(new MachineType({name: "machineB", cpu: "1", memory: "250Mi"}) instanceof MachineType).to.be.true;
    });

    it('allow to get CPU millis', function() {
      let object = new MachineType({name: "machineFoo", cpu: "1", memory: "250Mi"});
      expect(object.getCpuMillis()).to.equal(1000);
    });

    it('allow to get memory bytes', function() {
      let object = new MachineType({name: "machineBar", cpu: "1", memory: "250Mi"});
      expect(object.getMemBytes()).to.equal(250 * 1024 * 1024);
    });
  });
});
