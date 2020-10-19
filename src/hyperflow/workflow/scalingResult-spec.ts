
import ResourceRequirements from '../../kubernetes/resourceRequirements';
import ScalingResult from './scalingResult';
const expect = require('chai').expect;

describe('ScalingResult class', function() {
  context('Score calculation', function() {
    it('default score for no frames', function() {
      let object = new ScalingResult();
      expect(object.getFramesAmount()).to.equal(0);
      expect(object.getScore()).to.equal(Infinity);
    });

    it('count frames', function() {
      let object = new ScalingResult();
      let supply = new ResourceRequirements({cpu: "0", mem: "0"});
      let demand = new ResourceRequirements({cpu: "0", mem: "0"});
      object.addFrame(supply, demand);
      object.addFrame(supply, demand);
      object.addFrame(supply, demand);
      expect(object.getFramesAmount()).to.equal(3);
    });

    it('calculates simple score', function() {
      let object = new ScalingResult();
      let supply = new ResourceRequirements({cpu: "8", mem: "8G"});
      let demand = new ResourceRequirements({cpu: "10", mem: "10G"});
      object.addFrame(supply, demand); // -20%
      expect(object.getScore()).to.be.closeTo(5, 0.001);
      object.addFrame(supply, demand); // -20%
      expect(object.getScore()).to.be.closeTo(5, 0.001);
    });

    it('decrease score both for under/overprovision', function() {
      let object = new ScalingResult();
      let supply = new ResourceRequirements({cpu: "8", mem: "8G"});
      let demand = new ResourceRequirements({cpu: "10", mem: "10G"});
      object.addFrame(supply, demand); // -20%
      expect(object.getScore()).to.be.closeTo(5, 0.001);
      object.addFrame(demand, supply); // +25%
      expect(object.getScore()).to.be.closeTo(2.222, 0.001);
    });

    it('handle completely empty case', function() {
      let object1 = new ScalingResult();
      let supply1 = new ResourceRequirements({cpu: "0", mem: "0"});
      let demand1 = new ResourceRequirements({cpu: "0", mem: "0"});
      object1.addFrame(supply1, demand1);
      let score1 = object1.getScore();
      expect(score1).to.equal(Infinity);
    });

    //it('handle partialy empty cases', function() {
    //  //TODO
    //});

    it('calculate higher score for less overprovision', function() {
      let object1 = new ScalingResult();
      let supply1 = new ResourceRequirements({cpu: "3", mem: "500Mi"});
      let demand1 = new ResourceRequirements({cpu: "6", mem: "200Mi"});
      object1.addFrame(supply1, demand1);
      let score1 = object1.getScore();

      let object2 = new ScalingResult();
      let supply2 = new ResourceRequirements({cpu: "3", mem: "400Mi"});
      let demand2 = new ResourceRequirements({cpu: "6", mem: "200Mi"});
      object2.addFrame(supply2, demand2);
      let score2 = object2.getScore();

      expect(score2).greaterThan(score1);
    });

    it('calculate higher score for less underprovisioning', function() {
      let object1 = new ScalingResult();
      let supply1 = new ResourceRequirements({cpu: "3", mem: "0"});
      let demand1 = new ResourceRequirements({cpu: "6", mem: "0"});
      object1.addFrame(supply1, demand1);
      let score1 = object1.getScore();

      let object2 = new ScalingResult();
      let supply2 = new ResourceRequirements({cpu: "4", mem: "0"});
      let demand2 = new ResourceRequirements({cpu: "6", mem: "0"});
      object2.addFrame(supply2, demand2);
      let score2 = object2.getScore();

      expect(score2).greaterThan(score1);
    });
  });

  context('Constructor, setters and getters', function() {
    it('allow to create object without arguments', function() {
      expect(new ScalingResult() instanceof ScalingResult).to.be.true;
      expect(new ScalingResult() instanceof ScalingResult).to.be.true;
    });

    it('allow to set/get price', function() {
      let object = new ScalingResult();
      object.setPrice(123.45);
      expect(object.getPrice()).to.equal(123.45);
    });

    it('throw error when getting price without value', function() {
      let object = new ScalingResult();
      expect(() => { object.getPrice(); }).to.throw(Error);
    });
  });
});
