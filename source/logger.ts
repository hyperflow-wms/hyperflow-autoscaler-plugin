import winston = require('winston');
import { format } from 'winston';
let { combine, timestamp,  printf } = format;

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
    new winston.transports.File({ filename: 'logs/error.log', options: {}, level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log', options: {} }),
    new winston.transports.Console(),
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
    new winston.transports.File({ filename: 'logs/scaler.jsonl', options: {}}),
  ],
});

export default {
  'base': baseLogger,
  'scaling': scalingLogger,
};
