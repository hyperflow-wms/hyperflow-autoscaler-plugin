/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { getBaseLogger } from '@hyperflow/logger';

const Logger = getBaseLogger();

type timestamp = number;
type milliseconds = number;

class Timeframe {
  /**
   * Places data wit correponding equal-sized time intervals.
   * @param data data to pack, map with timestamp as key and value with array
   * @param start timestamp (ms) of start
   * @param end timestamp (ms) of end
   * @param interval milliseconds for interval
   *
   * CAUTION: data must be sorted by key (time).
   */
  public static packEqualIntervals<T>(
    data: Map<timestamp, T[]>,
    start: timestamp,
    end: timestamp,
    interval: milliseconds
  ): Map<timestamp, T[]> {
    /* Base equal frames - but not propagated and not averaged. */
    const dataIterator = data.entries();
    let currentResult: IteratorResult<[timestamp, T[]], any> | undefined;
    const intervals = new Map<number, T[]>();
    for (let currentTime = start; currentTime < end; currentTime += interval) {
      intervals.set(currentTime, []);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (currentResult === undefined) {
          currentResult = dataIterator.next();
          if (currentResult.done === true) {
            currentResult = undefined;
            break;
          }
          /* Handle case where given data is before start interval.
           * This is fast-forward for data iterator. */
          const time = currentResult.value[0];
          if (time < currentTime) {
            Logger.warn(
              '[Timeframe] There is data before packing start timestamp'
            );
            currentResult = undefined;
            continue;
          }
        }
        const element: [number, T[]] = currentResult.value;
        const time = element[0];
        const elementValues = element[1];
        if (time < currentTime || time >= currentTime + interval) {
          break;
        }

        intervals.set(currentTime, (intervals.get(currentTime) || []).concat(elementValues));
        currentResult = undefined;
      }
    }

    /* Warn about data left-overs, outside packing time range. */
    if (currentResult?.done !== undefined && currentResult.done == false) {
      Logger.warn('[Timeframe] There is data after packing end timestamp');
    }

    return intervals;
  }

  /**
   * Filling empty array (gaps) in map's data with last non-empty value.
   * @param data map with timestamp as key
   *
   * CAUTION: gap is something between two non-empty positions
   */
  public static fillArrayGapsWithLast<T>(
    data: Map<timestamp, T[]>
  ): Map<timestamp, T[]> {
    const filledData = new Map<timestamp, T[]>();
    const sortedKeys = Array.from(data.keys()).sort();

    /* Find first non-empty key. */
    let firstNonEmptyKey: number | null = null;
    for (const key of sortedKeys) {
      const REF_value = data.get(key);
      // @ts-ignore: Object is possibly 'undefined'.
      if (REF_value.length != 0) {
        firstNonEmptyKey = key;
        break;
      }
    }

    /* Find last non-empty key. */
    let lastNonEmptyKey: number | null = null;
    for (const key of sortedKeys) {
      const REF_value = data.get(key);
      // @ts-ignore: Object is possibly 'undefined'.
      if (REF_value.length != 0) {
        lastNonEmptyKey = key;
      }
    }

    /* No data to fill. */
    if (firstNonEmptyKey === null || lastNonEmptyKey === null) {
      return filledData;
    }

    /* Fill gaps. */
    let lastValue: T[] | null = null;
    for (const key of sortedKeys) {
      const REF_value = data.get(key);
      // @ts-ignore: Object is possibly 'undefined'.
      if (REF_value.length != 0) {
        // @ts-ignore: Object is possibly 'undefined'.
        lastValue = REF_value;
      }

      if (key < firstNonEmptyKey) {
        lastValue = [];
      }
      if (key > lastNonEmptyKey) {
        lastValue = [];
      }
      if (lastValue === null) {
        throw Error('Unable to fill last value');
      }
      filledData.set(key, lastValue);
    }

    return filledData;
  }
}

export default Timeframe;
