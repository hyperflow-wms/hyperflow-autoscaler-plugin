"use strict";
exports.__esModule = true;
var logger_1 = require("./logger");
var gcpProvider_1 = require("./gcpProvider");
var rpcChild_1 = require("./rpcChild");
var REACT_INTERVAL = 5000;
var SCALE_UP_UTILIZATION = 0.9;
var SCALE_DOWN_UTILIZATION = 0.5;
var Engine = /** @class */ (function () {
    function Engine() {
        this.provider =
            //new KindProvider();
            new gcpProvider_1["default"]();
        this.rpc = new rpcChild_1["default"](this);
    }
    Engine.prototype.run = function () {
        this.rpc.init();
        this.rpc.call('test', [], function (data) { console.log(data); });
        this.reactLoop();
    };
    Engine.prototype.reactLoop = function () {
        var _this = this;
        console.log("[AB asc] React loop started");
        this.provider.getSupply().then(function (supply) {
            _this.provider.getDemand().then(function (demand) {
                logger_1["default"].base.info('Ready workers: ' + _this.provider.getNumReadyWorkers()
                    + '/' + _this.provider.getNumAllWorkers());
                logger_1["default"].base.info('Demand: ' + demand);
                logger_1["default"].base.info('Supply: ' + supply);
                var numWorkers = _this.provider.getNumReadyWorkers();
                if (numWorkers instanceof Error) {
                    console.error(numWorkers.message);
                    return;
                }
                if ((demand[0] / supply[0]) > SCALE_UP_UTILIZATION) {
                    logger_1["default"].base.info("-> scale up (not enough CPU)");
                    _this.provider.resizeCluster(numWorkers + 1);
                }
                else if ((demand[1] / supply[1]) > SCALE_UP_UTILIZATION) {
                    logger_1["default"].base.info("-> scale up (not enough RAM)");
                    _this.provider.resizeCluster(numWorkers + 1);
                }
                else if ((demand[0] / supply[0]) < SCALE_DOWN_UTILIZATION && (demand[1] / supply[1]) < SCALE_DOWN_UTILIZATION && numWorkers > 0) {
                    logger_1["default"].base.info("-> scale down (too much CPU & RAM)\n");
                    _this.provider.resizeCluster(numWorkers - 1);
                }
                else {
                    logger_1["default"].base.info("-> cluster is fine :)\n");
                }
                setTimeout(function () { _this.reactLoop(); }, REACT_INTERVAL);
            });
        });
    };
    return Engine;
}());
var engine = new Engine();
engine.run();
