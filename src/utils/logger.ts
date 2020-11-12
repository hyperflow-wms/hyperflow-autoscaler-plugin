import pino = require('pino');

/*************
 * BASE LOGS *
 *************/

const baseLogger = pino();

function getBaseLogger() {
  return baseLogger;
}

export { getBaseLogger };

/***********************************
 * ADDITIONAL LOGS (SCALING CHART) *
 ***********************************/

const scalingLogger = baseLogger.child({"scalingLog": true});

export { scalingLogger };
