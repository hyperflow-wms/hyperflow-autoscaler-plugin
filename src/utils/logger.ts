import pino from 'pino';

/*************
 * BASE LOGS *
 *************/

const parseLogLevel = (): pino.Level => {
  const logLevelEnv = process.env.LOG_LEVEL;
  if (logLevelEnv) {
    return logLevelEnv as pino.Level;
  } else {
    return 'info';
  }
};

const baseLogger = pino({
  level: parseLogLevel(),
  customLevels: { verbose: 25, silly: 5 }
});

function getBaseLogger(): pino.Logger {
  return baseLogger;
}

export { getBaseLogger };

/***********************************
 * ADDITIONAL LOGS (SCALING CHART) *
 ***********************************/

const scalingLogger = baseLogger.child({ scalingLog: true });

export { scalingLogger };
