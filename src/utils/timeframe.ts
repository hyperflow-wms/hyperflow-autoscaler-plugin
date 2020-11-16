import { getBaseLogger } from './logger';

const Logger = getBaseLogger();

type timestamp = number;
type milliseconds = number;

class Timeframe
{
  /**
   * Places data wit correponding equal-sized time intervals.
   * @param data data to pack, map with timestamp as key and value with array
   * @param start timestamp (ms) of start
   * @param end timestamp (ms) of end
   * @param interval milliseconds for interval
   *
   * CAUTION: data must be sorted by key (time).
   */
  public static packEqualIntervals<T>(data: Map<timestamp, T[]>, start: timestamp, end: timestamp, interval: milliseconds): Map<timestamp, T[]> {
    /* Base equal frames - but not propagated and not averaged. */
    let dataIterator = data.entries();
    let currentResult: IteratorResult<[timestamp, T[]], any> | undefined;
    let intervals = new Map<number, T[]>();
    for (let currentTime = start; currentTime < end; currentTime += interval) {
      intervals.set(currentTime, []);
      // @ts-ignore: Object is possibly 'undefined'.
      let currentInterval: T[] = intervals.get(currentTime);
      while (true) {
        if (currentResult === undefined) {
          currentResult = dataIterator.next();
          if (currentResult.done == true) {
            currentResult = undefined;
            break;
          }
          /* Handle case where given data is before start interval.
           * This is fast-forward for data iterator. */
          let time = currentResult.value[0];
          if (time < currentTime) {
            Logger.warn("[Timeframe] There is data before packing start timestamp");
            currentResult = undefined;
            continue;
          }
        }
        let element: [number, T[]] = currentResult.value;
        let time = element[0];
        let elementValues = element[1];
        if (time < currentTime || time >= (currentTime + interval)) {
          break;
        }
        for (let val of elementValues) {
          currentInterval.push(val);
        }
        currentResult = undefined;
      }
    }

    /* Warn about data left-overs, outside packing time range. */
    if (currentResult?.done !== undefined && currentResult.done == false) {
      Logger.warn("[Timeframe] There is data after packing end timestamp");
    }

    return intervals;
  }

  /**
   * Filling empty array (gaps) in map's data with last non-empty value.
   * @param data map with timestamp as key
   *
   * CAUTION: gap is something between two non-empty positions
   */
  public static fillArrayGapsWithLast<T>(data: Map<timestamp, T[]>): Map<timestamp, T[]> {
    let filledData = new Map<timestamp, T[]>();
    let sortedKeys = Array.from(data.keys()).sort();

    /* Find first non-empty key. */
    let firstNonEmptyKey: number | null = null;
    for (let key of sortedKeys) {
      let REF_value = data.get(key);
      // @ts-ignore: Object is possibly 'undefined'.
      if (REF_value.length != 0) {
        firstNonEmptyKey = key;
        break;
      }
    }

    /* Find last non-empty key. */
    let lastNonEmptyKey: number | null = null;
    for (let key of sortedKeys) {
      let REF_value = data.get(key);
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
    for (let key of sortedKeys) {
      let REF_value = data.get(key);
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
