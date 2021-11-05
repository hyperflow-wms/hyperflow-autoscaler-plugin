import ResourceRequirements from '../../kubernetes/resourceRequirements';
import { ScalingResult } from './scalingResult';
import { expect } from 'chai';

describe('ScalingResult class', function () {
  context('Score calculation', function () {
    it('default score for no frames', function () {
      const object = new ScalingResult();
      expect(object.getFramesAmount()).to.equal(0);
      expect(object.getScore({})).to.equal(Infinity);
    });

    it('count frames', function () {
      const object = new ScalingResult();
      const supply = new ResourceRequirements({ cpu: '0', mem: '0' });
      const demand = new ResourceRequirements({ cpu: '0', mem: '0' });
      object.addFrame(supply, demand);
      object.addFrame(supply, demand);
      object.addFrame(supply, demand);
      expect(object.getFramesAmount()).to.equal(3);
    });

    it('calculates simple score', function () {
      const object = new ScalingResult();
      const supply = new ResourceRequirements({ cpu: '8', mem: '8G' });
      const demand = new ResourceRequirements({ cpu: '10', mem: '10G' });
      object.addFrame(supply, demand); // -20%
      expect(object.getScore({})).to.be.closeTo(5, 0.001);
    });

    it('accumulate missing supply', function () {
      const object = new ScalingResult();
      const supply = new ResourceRequirements({ cpu: '8', mem: '8G' });
      const demand = new ResourceRequirements({ cpu: '10', mem: '10G' });
      object.addFrame(supply, demand); // -20%
      expect(object.getScore({})).to.be.closeTo(5, 0.001);
      object.addFrame(demand, supply); // +25%
      expect(object.getScore({})).to.be.closeTo(5, 0.001);
    });

    it('handle completely empty case', function () {
      const object1 = new ScalingResult();
      const supply1 = new ResourceRequirements({ cpu: '0', mem: '0' });
      const demand1 = new ResourceRequirements({ cpu: '0', mem: '0' });
      object1.addFrame(supply1, demand1);
      const score1 = object1.getScore({});
      expect(score1).to.equal(Infinity);
    });

    //it('handle partialy empty cases', function() {
    //  //TODO
    //});

    it('calculate higher score for less overprovision', function () {
      const object1 = new ScalingResult();
      const supply1 = new ResourceRequirements({ cpu: '6', mem: '500Mi' });
      const demand1 = new ResourceRequirements({ cpu: '3', mem: '200Mi' });
      object1.addFrame(supply1, demand1);
      const score1 = object1.getScore({});

      const object2 = new ScalingResult();
      const supply2 = new ResourceRequirements({ cpu: '6', mem: '400Mi' });
      const demand2 = new ResourceRequirements({ cpu: '3', mem: '200Mi' });
      object2.addFrame(supply2, demand2);
      const score2 = object2.getScore({});
      expect(score2).greaterThan(score1);

      const object3 = new ScalingResult();
      const supply3 = new ResourceRequirements({ cpu: '5', mem: '400Mi' });
      const demand3 = new ResourceRequirements({ cpu: '3', mem: '200Mi' });
      object3.addFrame(supply3, demand3);
      const score3 = object3.getScore({});
      expect(score3).greaterThan(score1);
    });

    it('calculate higher score for less underprovisioning', function () {
      const object1 = new ScalingResult();
      const supply1 = new ResourceRequirements({ cpu: '3', mem: '100Mi' });
      const demand1 = new ResourceRequirements({ cpu: '6', mem: '200Mi' });
      object1.addFrame(supply1, demand1);
      const score1 = object1.getScore({});

      const object2 = new ScalingResult();
      const supply2 = new ResourceRequirements({ cpu: '4', mem: '100Mi' });
      const demand2 = new ResourceRequirements({ cpu: '6', mem: '200Mi' });
      object2.addFrame(supply2, demand2);
      const score2 = object2.getScore({});
      expect(score2).greaterThan(score1);

      const object3 = new ScalingResult();
      const supply3 = new ResourceRequirements({ cpu: '4', mem: '150Mi' });
      const demand3 = new ResourceRequirements({ cpu: '6', mem: '200Mi' });
      object3.addFrame(supply3, demand3);
      const score3 = object3.getScore({});
      expect(score3).greaterThan(score1);
    });

    it('[temporary idea] ignore overprovision when other resource is underutilized', function () {
      const object1 = new ScalingResult();
      const supply1 = new ResourceRequirements({ cpu: '3', mem: '400Mi' });
      const demand1 = new ResourceRequirements({ cpu: '6', mem: '200Mi' });
      object1.addFrame(supply1, demand1);
      const score1 = object1.getScore({});

      const object2 = new ScalingResult();
      const supply2 = new ResourceRequirements({ cpu: '3', mem: '500Mi' });
      const demand2 = new ResourceRequirements({ cpu: '6', mem: '200Mi' });
      object2.addFrame(supply2, demand2);
      const score2 = object2.getScore({});
      expect(score2).to.equal(score1);

      const object3 = new ScalingResult();
      const supply3 = new ResourceRequirements({ cpu: '4', mem: '500Mi' });
      const demand3 = new ResourceRequirements({ cpu: '6', mem: '200Mi' });
      object3.addFrame(supply3, demand3);
      const score3 = object3.getScore({});
      expect(score3).greaterThan(score2);
    });
  });

  context('Constructor, setters and getters', function () {
    it('allow to create object without arguments', function () {
      expect(new ScalingResult() instanceof ScalingResult).to.be.true;
      expect(new ScalingResult() instanceof ScalingResult).to.be.true;
    });

    it('allow to set/get price', function () {
      const object = new ScalingResult();
      object.setPrice(123.45);
      expect(object.getPrice()).to.equal(123.45);
    });

    it('throw error when getting price without value', function () {
      const object = new ScalingResult();
      expect(() => {
        object.getPrice();
      }).to.throw(Error);
    });
  });
});
