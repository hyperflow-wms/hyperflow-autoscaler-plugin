
import Utils from './utils';
const expect = require('chai').expect;

describe('Utils', function() {
  context('memory conversion to bytes', function() {
    it('handle plain integers', function() {
      expect(Utils.memoryStringToBytes("120")).to.equal(120);
      expect(Utils.memoryStringToBytes("45")).to.equal(45);
      expect(Utils.memoryStringToBytes("0")).to.equal(0);
    });

    it('handle scientific notation', function() {
      expect(Utils.memoryStringToBytes("10e2")).to.equal(1000);
      expect(Utils.memoryStringToBytes("4e3")).to.equal(4000);
      expect(Utils.memoryStringToBytes("4e0")).to.equal(4);
      expect(Utils.memoryStringToBytes("2e10")).to.equal(20000000000);
    });

    it('handle SI units', function() {
      expect(Utils.memoryStringToBytes("1K")).to.equal(1000);
      expect(Utils.memoryStringToBytes("1M")).to.equal(1000*1000);
      expect(Utils.memoryStringToBytes("1G")).to.equal(1000*1000*1000);
      expect(Utils.memoryStringToBytes("1T")).to.equal(1000*1000*1000*1000);
      expect(Utils.memoryStringToBytes("1P")).to.equal(1000*1000*1000*1000*1000);
      expect(Utils.memoryStringToBytes("1E")).to.equal(1000*1000*1000*1000*1000*1000);
    });

    it('handle power-of-2 units', function() {
      expect(Utils.memoryStringToBytes("1Ki")).to.equal(1024);
      expect(Utils.memoryStringToBytes("1Mi")).to.equal(1024*1024);
      expect(Utils.memoryStringToBytes("1Gi")).to.equal(1024*1024*1024);
      expect(Utils.memoryStringToBytes("1Ti")).to.equal(1024*1024*1024*1024);
      expect(Utils.memoryStringToBytes("1Pi")).to.equal(1024*1024*1024*1024*1024);
      expect(Utils.memoryStringToBytes("1Ei")).to.equal(1024*1024*1024*1024*1024*1024);
    });

    it('return error for for invalid formats', function() {
      expect(Utils.memoryStringToBytes("eee")).to.be.an('error');
      expect(Utils.memoryStringToBytes("1a")).to.be.an('error');
      expect(Utils.memoryStringToBytes("1.0a")).to.be.an('error');
      expect(Utils.memoryStringToBytes("10Kii")).to.be.an('error');
      expect(Utils.memoryStringToBytes("0-0")).to.be.an('error');
    });
  });

  context('cpu conversion to millis', function() {
    it('handle millis', function() {
      expect(Utils.cpuStringToMillis("0m")).to.equal(0);
      expect(Utils.cpuStringToMillis("1m")).to.equal(1);
      expect(Utils.cpuStringToMillis("24m")).to.equal(24);
      expect(Utils.cpuStringToMillis("12345m")).to.equal(12345);
    });

    it('handle plain integers', function() {
      expect(Utils.cpuStringToMillis("0")).to.equal(0);
      expect(Utils.cpuStringToMillis("1")).to.equal(1000);
      expect(Utils.cpuStringToMillis("23")).to.equal(23000);
    });

    it('handle decimals (3-places precision)', function() {
      expect(Utils.cpuStringToMillis("0.0")).to.equal(0);
      expect(Utils.cpuStringToMillis("0.1")).to.equal(100);
      expect(Utils.cpuStringToMillis("0.12")).to.equal(120);
      expect(Utils.cpuStringToMillis("0.123")).to.equal(123);
      expect(Utils.cpuStringToMillis("0.1234")).to.equal(123);
      expect(Utils.cpuStringToMillis("4.0")).to.equal(4000);
      expect(Utils.cpuStringToMillis("4.1")).to.equal(4100);
      expect(Utils.cpuStringToMillis("4.12")).to.equal(4120);
      expect(Utils.cpuStringToMillis("4.123")).to.equal(4123);
      expect(Utils.cpuStringToMillis("4.1234")).to.equal(4123);
    });

    it('return error for for invalid formats', function() {
      expect(Utils.cpuStringToMillis("eee")).to.be.an('error');
      expect(Utils.cpuStringToMillis("1m1")).to.be.an('error');
      expect(Utils.cpuStringToMillis("1.0m")).to.be.an('error');
      expect(Utils.cpuStringToMillis("10Kii")).to.be.an('error');
      expect(Utils.cpuStringToMillis("0-0")).to.be.an('error');
    });
  });
});
