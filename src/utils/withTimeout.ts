import { getBaseLogger } from './logger';

const Logger = getBaseLogger();

/**
 * returns a new function which calls the input function and "races" the result against a promise that throws an error on timeout.
 *
 * the result is:
 * - if your async fn takes longer than timeout ms, then an error will be thrown
 * - if your async fn executes faster than timeout ms, you'll get the normal response of the fn
 *
 * ### usage
 * ```ts
 * const result = await withTimeout(() => doSomethingAsync(...args), 3000);
 * ```
 * or
 * ```ts
 * const result = await withTimeout(doSomethingAsync, 3000)(...args);
 * ```
 * or even
 * ```ts
 * const doSomethingAsyncWithTimeout = withTimeout(doSomethingAsync, 3000);
 * const result = await doSomethingAsyncWithTimeout(...args);
 * ```
 *
 * ### WARNING
 * You will lose 'this' context, so this helpers seems to be not useful at all...
 */
const withTimeout = <R, P extends any, T extends (...args: P[]) => Promise<R>>(logic: T, ms: number) => {
  Logger.trace('[Helpers] Running function with timeout ' + ms.toString() + 'ms');
  return (...args: Parameters<T>) => {
    // create a promise that rejects in <ms> milliseconds; https://italonascimento.github.io/applying-a-timeout-to-your-promises/
    const timeout = new Promise((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`promise was timed out in ${ms} ms, by withTimeout`));
      }, ms); // tslint:disable-line align
    });

    // returns a "race" between our timeout and the function executed with the input params
    return Promise.race([
      logic(...args), // the wrapped fn, executed w/ the input params
      timeout, // the timeout
    ]) as Promise<R>;
  };
};

export default withTimeout;
