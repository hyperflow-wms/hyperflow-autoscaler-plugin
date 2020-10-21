import winston = require('winston');
import path = require('path');
import { format } from 'winston';
let { combine, timestamp,  printf } = format;
import stackTrace = require('stack-trace');

const logDir = path.join(__dirname, '..', 'logs');

/*************
 * BASE LOGS *
 *************/

const myBaseLogFormat = combine(
  timestamp(),
  printf(({ level, message, timestamp }) => {
    return `[${timestamp}][${level}] ${message}`;
  })
);

const commonFileDebugTransport = new winston.transports.File({ filename: path.join(logDir, 'debug.log'), options: {}, level: 'debug' });
const commonFileErrorTransport = new winston.transports.File({ filename: path.join(logDir, 'error.log'), options: {}, level: 'error' });
const commonFileSillyTransport =  new winston.transports.File({ filename: path.join(logDir, 'silly.log'), options: {}, level: 'silly' });
const commonConsoleInfoTransport = new winston.transports.Console({ level: 'info' });

let baseLoggers = new Map<string, winston.Logger>();

function getBaseLogger(name?: string): winston.Logger {
  /* Fallback to parent module name. */
  if (name === undefined) {
    let callerFilename = stackTrace.get()[1].getFileName();
    name = path.basename(callerFilename, path.extname(callerFilename));
  }

  /* Get existing logger. */
  if (baseLoggers.has(name) === true) {
    // @ts-ignore: Object is possibly 'undefined'.
    let logger: winston.Logger = baseLoggers.get(name);
    return logger;
  }

  /* Make new logger. */
  const logName = '_' + name + '.log';
  const newFileTransport = new winston.transports.File({ filename: path.join(logDir, logName), options: {}, level: 'silly' });
  const newBaseLogger = winston.loggers.add(name, {
    level: 'info',
    format: myBaseLogFormat,
    defaultMeta: { service: 'user-service' },
    transports: [
      commonFileDebugTransport,
      commonFileErrorTransport,
      commonFileSillyTransport,
      commonConsoleInfoTransport,
      newFileTransport
    ],
  });

  baseLoggers.set(name, newBaseLogger);
  return newBaseLogger;
}

export { getBaseLogger };

/***********************************
 * ADDITIONAL LOGS (SCALING CHART) *
 ***********************************/

const scalingLogFormat = combine(
  timestamp(),
  printf(({ level, message, timestamp }) => {
    let jsonData = JSON.parse(message);
    jsonData['time'] = timestamp.slice(0, -1);
    let logString = JSON.stringify(jsonData);
    return `${logString}`;
  })
);

const scalingLogger = winston.loggers.add('scaling', {
  level: 'info',
  format: scalingLogFormat,
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'scaler.jsonl'), options: {}}),
  ],
});

export { scalingLogger };
