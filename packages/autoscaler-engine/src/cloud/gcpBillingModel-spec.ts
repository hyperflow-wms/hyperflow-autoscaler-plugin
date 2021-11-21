import GCPBillingModel from './gcpBillingModel';
import {
  N1_HIGHCPU_2,
  N1_HIGHCPU_4,
  N1_HIGHCPU_8,
  N1_HIGHCPU_16,
  N1_HIGHCPU_32,
  N1_HIGHCPU_64,
  N1_HIGHCPU_96,
  GCPMachines
} from './gcpMachines';
import MachineType from './machine';
import { expect } from 'chai';

function makeMachine(name: string) {
  const obj = GCPMachines.makeObject(name);
  return obj;
}

describe('GCPBillingModel object', function () {
  const model = new GCPBillingModel();

  context('Price knowledge', function () {
    it('know price of N1 high-CPU machines', function () {
      expect(model.getHourlyPrice(makeMachine(N1_HIGHCPU_2))).to.be.an(
        'number'
      );
      expect(model.getHourlyPrice(makeMachine(N1_HIGHCPU_4))).to.be.an(
        'number'
      );
      expect(model.getHourlyPrice(makeMachine(N1_HIGHCPU_8))).to.be.an(
        'number'
      );
      expect(model.getHourlyPrice(makeMachine(N1_HIGHCPU_16))).to.be.an(
        'number'
      );
      expect(model.getHourlyPrice(makeMachine(N1_HIGHCPU_32))).to.be.an(
        'number'
      );
      expect(model.getHourlyPrice(makeMachine(N1_HIGHCPU_64))).to.be.an(
        'number'
      );
      expect(model.getHourlyPrice(makeMachine(N1_HIGHCPU_96))).to.be.an(
        'number'
      );
    });

    it('throw error for unknown machines', function () {
      expect(() => {
        model.getHourlyPrice(
          new MachineType({ name: 'foo', cpu: '0', memory: '0' })
        );
      }).to.throw(Error);
      expect(() => {
        model.getHourlyPrice(
          new MachineType({ name: 'bar', cpu: '0', memory: '0' })
        );
      }).to.throw(Error);
    });
  });

  context('Billing model', function () {
    it('bill for whole first minute', function () {
      const pricePer0ms = model.getPriceForTime(makeMachine(N1_HIGHCPU_2), 0);
      expect(pricePer0ms > 0).to.be.true;
      expect(pricePer0ms).to.be.equal(
        model.getPriceForTime(makeMachine(N1_HIGHCPU_2), 60 * 1000)
      );

      const pricePer1ms = model.getPriceForTime(makeMachine(N1_HIGHCPU_16), 0);
      expect(pricePer1ms > 0).to.be.true;
      expect(pricePer1ms).to.be.equal(
        model.getPriceForTime(makeMachine(N1_HIGHCPU_16), 60 * 1000)
      );
    });

    it('bill secondly after first minute (rounding up)', function () {
      const price1 = model.getPriceForTime(makeMachine(N1_HIGHCPU_16), 60023.4);
      const price2 = model.getPriceForTime(makeMachine(N1_HIGHCPU_16), 60023.9);
      const price3 = model.getPriceForTime(makeMachine(N1_HIGHCPU_16), 60024);
      expect([price1, price2, price3].every((x) => x > 0)).to.be.true;
      expect(price1).to.equal(price2);
      expect(price2).to.equal(price3);
    });

    it('handle scaling down calculations', function () {
      const price1 = model.getPriceForDynamicInterval(
        makeMachine(N1_HIGHCPU_16),
        0,
        5,
        20 * 1000,
        3,
        130 * 1000
      );
      const price2 = model.getPriceForDynamicInterval(
        makeMachine(N1_HIGHCPU_16),
        0,
        5,
        30 * 1000,
        3,
        130 * 1000
      );
      const basePrice =
        5 * model.getPriceForTime(makeMachine(N1_HIGHCPU_16), 60 * 1000) +
        3 * model.getPriceForTime(makeMachine(N1_HIGHCPU_16), 70 * 1000);
      expect(price1).to.equal(price2);
      expect(price2).to.equal(basePrice);

      const price4 = model.getPriceForDynamicInterval(
        makeMachine(N1_HIGHCPU_16),
        0,
        5,
        70 * 1000,
        3,
        130 * 1000
      );
      expect(price4).to.greaterThan(basePrice);
    });

    it('handle scaling up calculations', function () {
      const price3 = model.getPriceForDynamicInterval(
        makeMachine(N1_HIGHCPU_16),
        0,
        3,
        80 * 1000,
        5,
        200 * 1000
      );
      const basePrice =
        3 * model.getPriceForTime(makeMachine(N1_HIGHCPU_16), 80 * 1000) +
        5 * model.getPriceForTime(makeMachine(N1_HIGHCPU_16), 120 * 1000);
      expect(price3).to.equal(basePrice);
    });
  });

  context('Additional utils', function () {
    it('allow to pass interval as two timestamp range', function () {
      const price1 = model.getPriceForInterval(
        makeMachine(N1_HIGHCPU_32),
        461000,
        561000
      );
      const price2 = model.getPriceForTime(makeMachine(N1_HIGHCPU_32), 100000);
      expect([price1, price2].every((x) => x > 0)).to.be.true;
      expect(price1).to.equal(price2);
    });
  });
});
