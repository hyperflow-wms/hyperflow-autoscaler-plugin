
import Resources from './resources';
const expect = require('chai').expect;

describe('Resources', function() {
  context('memory conversion to bytes', function() {
    it('handle plain integers', function() {
      expect(Resources.memoryStringToBytes("120")).to.equal(120);
      expect(Resources.memoryStringToBytes("45")).to.equal(45);
      expect(Resources.memoryStringToBytes("0")).to.equal(0);
    });

    it('handle scientific notation', function() {
      expect(Resources.memoryStringToBytes("10e2")).to.equal(1000);
      expect(Resources.memoryStringToBytes("4e3")).to.equal(4000);
      expect(Resources.memoryStringToBytes("4e0")).to.equal(4);
      expect(Resources.memoryStringToBytes("2e10")).to.equal(20000000000);
    });

    it('handle SI units', function() {
      expect(Resources.memoryStringToBytes("1K")).to.equal(1000);
      expect(Resources.memoryStringToBytes("1M")).to.equal(1000*1000);
      expect(Resources.memoryStringToBytes("1G")).to.equal(1000*1000*1000);
      expect(Resources.memoryStringToBytes("1T")).to.equal(1000*1000*1000*1000);
      expect(Resources.memoryStringToBytes("1P")).to.equal(1000*1000*1000*1000*1000);
      expect(Resources.memoryStringToBytes("1E")).to.equal(1000*1000*1000*1000*1000*1000);
    });

    it('handle power-of-2 units', function() {
      expect(Resources.memoryStringToBytes("1Ki")).to.equal(1024);
      expect(Resources.memoryStringToBytes("1Mi")).to.equal(1024*1024);
      expect(Resources.memoryStringToBytes("1Gi")).to.equal(1024*1024*1024);
      expect(Resources.memoryStringToBytes("1Ti")).to.equal(1024*1024*1024*1024);
      expect(Resources.memoryStringToBytes("1Pi")).to.equal(1024*1024*1024*1024*1024);
      expect(Resources.memoryStringToBytes("1Ei")).to.equal(1024*1024*1024*1024*1024*1024);
    });

    it('return error for for invalid formats', function() {
      expect(Resources.memoryStringToBytes("eee")).to.be.an('error');
      expect(Resources.memoryStringToBytes("1a")).to.be.an('error');
      expect(Resources.memoryStringToBytes("1.0a")).to.be.an('error');
      expect(Resources.memoryStringToBytes("10Kii")).to.be.an('error');
      expect(Resources.memoryStringToBytes("0-0")).to.be.an('error');
    });
  });

  context('cpu conversion to millis', function() {
    it('handle millis', function() {
      expect(Resources.cpuStringToMillis("0m")).to.equal(0);
      expect(Resources.cpuStringToMillis("1m")).to.equal(1);
      expect(Resources.cpuStringToMillis("24m")).to.equal(24);
      expect(Resources.cpuStringToMillis("12345m")).to.equal(12345);
    });

    it('handle plain integers', function() {
      expect(Resources.cpuStringToMillis("0")).to.equal(0);
      expect(Resources.cpuStringToMillis("1")).to.equal(1000);
      expect(Resources.cpuStringToMillis("23")).to.equal(23000);
    });

    it('handle decimals (3-places precision)', function() {
      expect(Resources.cpuStringToMillis("0.0")).to.equal(0);
      expect(Resources.cpuStringToMillis("0.1")).to.equal(100);
      expect(Resources.cpuStringToMillis("0.12")).to.equal(120);
      expect(Resources.cpuStringToMillis("0.123")).to.equal(123);
      expect(Resources.cpuStringToMillis("0.1234")).to.equal(123);
      expect(Resources.cpuStringToMillis("4.0")).to.equal(4000);
      expect(Resources.cpuStringToMillis("4.1")).to.equal(4100);
      expect(Resources.cpuStringToMillis("4.12")).to.equal(4120);
      expect(Resources.cpuStringToMillis("4.123")).to.equal(4123);
      expect(Resources.cpuStringToMillis("4.1234")).to.equal(4123);
    });

    it('return error for for invalid formats', function() {
      expect(Resources.cpuStringToMillis("eee")).to.be.an('error');
      expect(Resources.cpuStringToMillis("1m1")).to.be.an('error');
      expect(Resources.cpuStringToMillis("1.0m")).to.be.an('error');
      expect(Resources.cpuStringToMillis("10Kii")).to.be.an('error');
      expect(Resources.cpuStringToMillis("0-0")).to.be.an('error');
    });
  });
});
