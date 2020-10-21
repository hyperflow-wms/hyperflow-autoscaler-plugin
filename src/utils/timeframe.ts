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
   * Filling empty map's data with last non-empty value.
   * @param data map with timestamp as key
   * @param defaultStart default value used until first non-empty row
   *
   * CAUTION: data must be sorted by key (time).
   */
  public static fillEmptyWithLast<T extends { toString(): String }>(data: Map<timestamp, T>, defaultStart: T): Map<timestamp, T> {
    let filledData = new Map<timestamp, T>();
    let lastValue: T = defaultStart;
    data.forEach((value, timeKey) => {
      if (value.toString() != "") {
        lastValue = value;
      }
      filledData.set(timeKey, lastValue);
    });

    return filledData;
  }
}

export default Timeframe;
