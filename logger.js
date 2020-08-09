"use strict";
exports.__esModule = true;
var winston = require("winston");
var winston_1 = require("winston");
var combine = winston_1.format.combine, timestamp = winston_1.format.timestamp, printf = winston_1.format.printf;
var myBaseLogFormat = combine(timestamp(), printf(function (_a) {
    var level = _a.level, message = _a.message, timestamp = _a.timestamp;
    return "[" + timestamp + "][" + level + "] " + message;
}));
var baseLogger = winston.loggers.add('runtime', {
    level: 'info',
    format: myBaseLogFormat,
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', options: {}, level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log', options: {} }),
        new winston.transports.Console(),
    ]
});
var scalingLogFormat = combine(timestamp(), printf(function (_a) {
    var level = _a.level, message = _a.message, timestamp = _a.timestamp;
    var jsonData = JSON.parse(message);
    jsonData['time'] = timestamp.slice(0, -1);
    var logString = JSON.stringify(jsonData);
    return "" + logString;
}));
var scalingLogger = winston.loggers.add('scaling', {
    level: 'info',
    format: scalingLogFormat,
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: 'logs/scaler.jsonl', options: {} }),
    ]
});
exports["default"] = {
    'base': baseLogger,
    'scaling': scalingLogger
};
