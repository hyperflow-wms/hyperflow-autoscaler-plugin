
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
  });
});
