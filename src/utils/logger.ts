import pino = require('pino');

/*************
 * BASE LOGS *
 *************/

const baseLogger = pino({customLevels: { verbose: 25, silly: 5 }});

function getBaseLogger() {
  return baseLogger;
}

export { getBaseLogger };

/***********************************
 * ADDITIONAL LOGS (SCALING CHART) *
 ***********************************/

const scalingLogger = baseLogger.child({"scalingLog": true});

export { scalingLogger };
