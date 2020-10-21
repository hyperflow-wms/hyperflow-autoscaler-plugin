import winston = require('winston');
import path = require('path');
import { format } from 'winston';
let { combine, timestamp,  printf } = format;

const logDir = path.join(__dirname, '..', 'logs');

const myBaseLogFormat = combine(
  timestamp(),
  printf(({ level, message, timestamp }) => {
    return `[${timestamp}][${level}] ${message}`;
  })
);

const baseLogger = winston.loggers.add('runtime', {
  level: 'info',
  format: myBaseLogFormat,
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), options: {}, level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'debug.log'), options: {}, level: 'debug' }),
    new winston.transports.File({ filename: path.join(logDir, 'silly.log'), options: {}, level: 'silly' }),
    new winston.transports.Console({ level: 'info' }),
  ],
});

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

export default {
  'base': baseLogger,
  'scaling': scalingLogger,
};
