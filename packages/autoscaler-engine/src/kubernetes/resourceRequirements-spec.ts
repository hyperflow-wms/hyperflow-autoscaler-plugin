import RR from './resourceRequirements';
import { expect } from 'chai';

describe('ResourceRequests class', function () {
  context('Exported util for memory conversion to bytes', function () {
    it('handle plain integers', function () {
      expect(RR.Utils.parseMemString('120')).to.equal(120);
      expect(RR.Utils.parseMemString('45')).to.equal(45);
      expect(RR.Utils.parseMemString('0')).to.equal(0);
    });

    it('handle scientific notation', function () {
      expect(RR.Utils.parseMemString('10e2')).to.equal(1000);
      expect(RR.Utils.parseMemString('4e3')).to.equal(4000);
      expect(RR.Utils.parseMemString('4e0')).to.equal(4);
      expect(RR.Utils.parseMemString('2e10')).to.equal(20000000000);
    });

    it('handle SI units', function () {
      expect(RR.Utils.parseMemString('1K')).to.equal(1000);
      expect(RR.Utils.parseMemString('1M')).to.equal(1000 * 1000);
      expect(RR.Utils.parseMemString('1G')).to.equal(1000 * 1000 * 1000);
      expect(RR.Utils.parseMemString('1T')).to.equal(1000 * 1000 * 1000 * 1000);
      expect(RR.Utils.parseMemString('1P')).to.equal(
        1000 * 1000 * 1000 * 1000 * 1000
      );
      expect(RR.Utils.parseMemString('1E')).to.equal(
        1000 * 1000 * 1000 * 1000 * 1000 * 1000
      );
    });

    it('handle power-of-2 units', function () {
      expect(RR.Utils.parseMemString('1Ki')).to.equal(1024);
      expect(RR.Utils.parseMemString('1Mi')).to.equal(1024 * 1024);
      expect(RR.Utils.parseMemString('1Gi')).to.equal(1024 * 1024 * 1024);
      expect(RR.Utils.parseMemString('1Ti')).to.equal(
        1024 * 1024 * 1024 * 1024
      );
      expect(RR.Utils.parseMemString('1Pi')).to.equal(
        1024 * 1024 * 1024 * 1024 * 1024
      );
      expect(RR.Utils.parseMemString('1Ei')).to.equal(
        1024 * 1024 * 1024 * 1024 * 1024 * 1024
      );
    });

    it('handle fractions', function () {
      expect(RR.Utils.parseMemString('2.5Mi')).to.equal(2.5 * 1024 * 1024);
      expect(RR.Utils.parseMemString('3.5G')).to.equal(
        3.5 * 1000 * 1000 * 1000
      );
    });

    it('throw error for invalid formats', function () {
      expect(() => {
        RR.Utils.parseMemString('eee');
      }).to.throw(Error);
      expect(() => {
        RR.Utils.parseMemString('1a');
      }).to.throw(Error);
      expect(() => {
        RR.Utils.parseMemString('1.0a');
      }).to.throw(Error);
      expect(() => {
        RR.Utils.parseMemString('10Kii');
      }).to.throw(Error);
      expect(() => {
        RR.Utils.parseMemString('0-0');
      }).to.throw(Error);
      expect(() => {
        RR.Utils.parseMemString('10.2');
      }).to.throw(Error);
    });
  });

  context('Exported util for cpu conversion to millis', function () {
    it('handle millis', function () {
      expect(RR.Utils.parseCpuString('0m')).to.equal(0);
      expect(RR.Utils.parseCpuString('1m')).to.equal(1);
      expect(RR.Utils.parseCpuString('24m')).to.equal(24);
      expect(RR.Utils.parseCpuString('12345m')).to.equal(12345);
    });

    it('handle plain integers', function () {
      expect(RR.Utils.parseCpuString('0')).to.equal(0);
      expect(RR.Utils.parseCpuString('1')).to.equal(1000);
      expect(RR.Utils.parseCpuString('23')).to.equal(23000);
    });

    it('handle decimals (3-places precision)', function () {
      expect(RR.Utils.parseCpuString('0.0')).to.equal(0);
      expect(RR.Utils.parseCpuString('0.1')).to.equal(100);
      expect(RR.Utils.parseCpuString('0.12')).to.equal(120);
      expect(RR.Utils.parseCpuString('0.123')).to.equal(123);
      expect(RR.Utils.parseCpuString('0.1234')).to.equal(123);
      expect(RR.Utils.parseCpuString('4.0')).to.equal(4000);
      expect(RR.Utils.parseCpuString('4.1')).to.equal(4100);
      expect(RR.Utils.parseCpuString('4.12')).to.equal(4120);
      expect(RR.Utils.parseCpuString('4.123')).to.equal(4123);
      expect(RR.Utils.parseCpuString('4.1234')).to.equal(4123);
    });

    it('throw error for invalid formats', function () {
      expect(() => {
        RR.Utils.parseCpuString('eee');
      }).to.throw(Error);
      expect(() => {
        RR.Utils.parseCpuString('1m1');
      }).to.throw(Error);
      expect(() => {
        RR.Utils.parseCpuString('1.0m');
      }).to.throw(Error);
      expect(() => {
        RR.Utils.parseCpuString('10Kii');
      }).to.throw(Error);
      expect(() => {
        RR.Utils.parseCpuString('0-0');
      }).to.throw(Error);
    });
  });

  context('Constructor and getters', function () {
    it('allow to create object from cpu, mem strings', function () {
      expect(new RR({ cpu: '450m', mem: '1Gi' }) instanceof RR).to.be.true;
      expect(new RR({ cpu: '0', mem: '0' }) instanceof RR).to.be.true;
    });

    it('allow to get CPU millis', function () {
      const object = new RR({ cpu: '450m', mem: '0' });
      expect(object.getCpuMillis()).to.equal(450);
    });

    it('allow to get memory bytes', function () {
      const object = new RR({ cpu: '0', mem: '20M' });
      expect(object.getMemBytes()).to.equal(20 * 1000 * 1000);
    });
  });

  context('Additional resource operators', function () {
    it('calculate average', function () {
      let resAvg = RR.Utils.getAverage([]);
      expect(resAvg.getCpuMillis()).to.equal(0);
      expect(resAvg.getMemBytes()).to.equal(0);

      resAvg = RR.Utils.getAverage([
        new RR({ cpu: '0.1', mem: '20K' }),
        new RR({ cpu: '0.3', mem: '40K' }),
        new RR({ cpu: '0.5', mem: '60K' })
      ]);
      expect(resAvg.getCpuMillis()).to.equal(300);
      expect(resAvg.getMemBytes()).to.equal(40 * 1000);
    });

    it('calculate sum', function () {
      let resSum = RR.Utils.getSum([]);
      expect(resSum.getCpuMillis()).to.equal(0);
      expect(resSum.getMemBytes()).to.equal(0);

      resSum = RR.Utils.getSum([
        new RR({ cpu: '0.1', mem: '20K' }),
        new RR({ cpu: '0.3', mem: '40K' }),
        new RR({ cpu: '0.5', mem: '60K' })
      ]);
      expect(resSum.getCpuMillis()).to.equal(900);
      expect(resSum.getMemBytes()).to.equal(120 * 1000);
    });

    it('override toString method', function () {
      const res = new RR({ cpu: '0.1', mem: '20K' });
      expect(res.toString()).to.equal('{CPU: 100m; MEM: 20000B}');
    });
  });
});
