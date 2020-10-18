
import Timeframe from './timeframe';
import Loggers from './logger';
import sinon = require("sinon");
const expect = require('chai').expect;

describe('Timeframe class', function() {
  context('Packing data into equal intervals', function() {
    it('handle empty data', function() {
      let data: Map<number, string[]> = new Map();
      let expectedResult = new Map();
      expectedResult.set(100, []);
      expectedResult.set(110, []);
      expectedResult.set(120, []);
      expectedResult.set(130, []);
      expectedResult.set(140, []);
      expectedResult.set(150, []);
      expectedResult.set(160, []);
      expectedResult.set(170, []);
      expectedResult.set(180, []);
      expectedResult.set(190, []);
      expect(Timeframe.packEqualIntervals(data, 100, 200, 10)).to.deep.equal(expectedResult);
    });

    it('handle data inside given timestamps', function() {
      let data: Map<number, string[]> = new Map();
      data.set(123, ["A"]);
      data.set(124, []);
      data.set(135, ["C", "D"]);
      data.set(136, ["E", "F", "G"]);
      data.set(143, ["H"]);
      data.set(144, ["I"]);
      data.set(160, ["J"]);
      data.set(199, ["K"]);
      let expectedResult = new Map();
      expectedResult.set(100, []);
      expectedResult.set(110, []);
      expectedResult.set(120, ["A"]);
      expectedResult.set(130, ["C", "D", "E", "F", "G"]);
      expectedResult.set(140, ["H", "I"]);
      expectedResult.set(150, []);
      expectedResult.set(160, ["J"]);
      expectedResult.set(170, []);
      expectedResult.set(180, []);
      expectedResult.set(190, ["K"]);
      expect(Timeframe.packEqualIntervals(data, 100, 200, 10)).to.deep.equal(expectedResult);
    });

    it('skip data before given timestamps with warning', function() {
      let data: Map<number, string[]> = new Map();
      data.set(90, ["A"]);
      data.set(95, []);
      data.set(99, ["C", "D"]);
      data.set(134, ["E"]);
      let expectedResult = new Map();
      expectedResult.set(100, []);
      expectedResult.set(110, []);
      expectedResult.set(120, []);
      expectedResult.set(130, ["E"]);
      expectedResult.set(140, []);
      expectedResult.set(150, []);
      expectedResult.set(160, []);
      expectedResult.set(170, []);
      expectedResult.set(180, []);
      expectedResult.set(190, []);
      let warnSpy = sinon.spy(Loggers.base, 'warn');
      expect(Timeframe.packEqualIntervals(data, 100, 200, 10)).to.deep.equal(expectedResult);
      warnSpy.restore();
      sinon.assert.called(warnSpy);
    });

    it('skip data after given timestamps with warning', function() {
      let data: Map<number, string[]> = new Map();
      data.set(190, ["A"]);
      data.set(195, ["B"]);
      data.set(200, ["C"]);
      data.set(212, ["D", "E"]);
      let expectedResult = new Map();
      expectedResult.set(100, []);
      expectedResult.set(110, []);
      expectedResult.set(120, []);
      expectedResult.set(130, []);
      expectedResult.set(140, []);
      expectedResult.set(150, []);
      expectedResult.set(160, []);
      expectedResult.set(170, []);
      expectedResult.set(180, []);
      expectedResult.set(190, ["A", "B"]);
      let warnSpy = sinon.spy(Loggers.base, 'warn');
      expect(Timeframe.packEqualIntervals(data, 100, 200, 10)).to.deep.equal(expectedResult);
      warnSpy.restore();
      sinon.assert.called(warnSpy);
    });
  });
});
