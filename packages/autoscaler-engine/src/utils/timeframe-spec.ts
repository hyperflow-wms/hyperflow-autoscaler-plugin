import Timeframe from './timeframe';
import { getBaseLogger } from '@hyperflow/logger';
import sinon = require('sinon');
import { expect } from 'chai';

describe('Timeframe class', function () {
  context('Packing data into equal intervals', function () {
    it('handle empty data', function () {
      const data: Map<number, string[]> = new Map();
      const expectedResult = new Map();
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
      expect(Timeframe.packEqualIntervals(data, 100, 200, 10)).to.deep.equal(
        expectedResult
      );
    });

    it('handle data inside given timestamps', function () {
      const data: Map<number, string[]> = new Map();
      data.set(123, ['A']);
      data.set(124, []);
      data.set(135, ['C', 'D']);
      data.set(136, ['E', 'F', 'G']);
      data.set(143, ['H']);
      data.set(144, ['I']);
      data.set(160, ['J']);
      data.set(199, ['K']);
      const expectedResult = new Map();
      expectedResult.set(100, []);
      expectedResult.set(110, []);
      expectedResult.set(120, ['A']);
      expectedResult.set(130, ['C', 'D', 'E', 'F', 'G']);
      expectedResult.set(140, ['H', 'I']);
      expectedResult.set(150, []);
      expectedResult.set(160, ['J']);
      expectedResult.set(170, []);
      expectedResult.set(180, []);
      expectedResult.set(190, ['K']);
      expect(Timeframe.packEqualIntervals(data, 100, 200, 10)).to.deep.equal(
        expectedResult
      );
    });

    it('skip data before given timestamps with warning', function () {
      const data: Map<number, string[]> = new Map();
      data.set(90, ['A']);
      data.set(95, []);
      data.set(99, ['C', 'D']);
      data.set(134, ['E']);
      const expectedResult = new Map();
      expectedResult.set(100, []);
      expectedResult.set(110, []);
      expectedResult.set(120, []);
      expectedResult.set(130, ['E']);
      expectedResult.set(140, []);
      expectedResult.set(150, []);
      expectedResult.set(160, []);
      expectedResult.set(170, []);
      expectedResult.set(180, []);
      expectedResult.set(190, []);
      const warnSpy = sinon.spy(getBaseLogger(), 'warn');
      expect(Timeframe.packEqualIntervals(data, 100, 200, 10)).to.deep.equal(
        expectedResult
      );
      warnSpy.restore();
      sinon.assert.called(warnSpy);
    });

    it('skip data after given timestamps with warning', function () {
      const data: Map<number, string[]> = new Map();
      data.set(190, ['A']);
      data.set(195, ['B']);
      data.set(200, ['C']);
      data.set(212, ['D', 'E']);
      const expectedResult = new Map();
      expectedResult.set(100, []);
      expectedResult.set(110, []);
      expectedResult.set(120, []);
      expectedResult.set(130, []);
      expectedResult.set(140, []);
      expectedResult.set(150, []);
      expectedResult.set(160, []);
      expectedResult.set(170, []);
      expectedResult.set(180, []);
      expectedResult.set(190, ['A', 'B']);
      const warnSpy = sinon.spy(getBaseLogger(), 'warn');
      expect(Timeframe.packEqualIntervals(data, 100, 200, 10)).to.deep.equal(
        expectedResult
      );
      warnSpy.restore();
      sinon.assert.called(warnSpy);
    });
  });

  context('Filling non-empty rows', function () {
    it('do not modify full data', function () {
      const data: Map<number, string[]> = new Map();
      data.set(100, ['test']);
      data.set(110, ['foo', 'bar']);
      data.set(120, ['baz']);
      data.set(130, ['woof']);
      const expectedResult = new Map();
      expectedResult.set(100, ['test']);
      expectedResult.set(110, ['foo', 'bar']);
      expectedResult.set(120, ['baz']);
      expectedResult.set(130, ['woof']);
      expect(Timeframe.fillArrayGapsWithLast(data)).to.deep.equal(
        expectedResult
      );
    });

    it('handle partial data', function () {
      const data: Map<number, string[]> = new Map();
      data.set(100, []);
      data.set(110, []);
      data.set(120, ['foo']);
      data.set(130, []);
      data.set(140, []);
      data.set(150, ['bar']);
      data.set(160, []);
      data.set(170, ['baz']);
      data.set(180, []);
      data.set(190, []);
      const expectedResult = new Map();
      expectedResult.set(100, []);
      expectedResult.set(110, []);
      expectedResult.set(120, ['foo']);
      expectedResult.set(130, ['foo']);
      expectedResult.set(140, ['foo']);
      expectedResult.set(150, ['bar']);
      expectedResult.set(160, ['bar']);
      expectedResult.set(170, ['baz']);
      expectedResult.set(180, []);
      expectedResult.set(190, []);
      expect(Timeframe.fillArrayGapsWithLast(data)).to.deep.equal(
        expectedResult
      );
    });
  });
});
