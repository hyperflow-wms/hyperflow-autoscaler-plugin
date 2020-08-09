"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var logger_1 = require("./logger");
var baseProvider_1 = require("./baseProvider");
var utils_1 = require("./utils");
var child_process = require("child_process");
var FAKE_CPU_FACTOR = 0.25;
var KindProvider = /** @class */ (function (_super) {
    __extends(KindProvider, _super);
    function KindProvider() {
        var _this = _super.call(this) || this;
        _this.workerNodesNames = [];
        _this.nFirstWorkerNodesReady = 0;
        _this.initialized = false;
        return _this;
    }
    KindProvider.prototype.getNodeCpu = function (node) {
        var allocatable = node.status.allocatable; // allocatable = capacity - reserved
        var cpu = utils_1["default"].cpuStringToNum(allocatable.cpu);
        if (cpu instanceof Error) {
            return cpu;
        }
        // We are using quota/period to control cpu usage.
        // Event though we have LXCFS, we are not using cpusets, so every
        // node can see 12 cores. We have to use custom factor to simulate it.
        var fixedCpu = cpu * FAKE_CPU_FACTOR;
        return fixedCpu;
    };
    KindProvider.prototype.getNodeMemory = function (node) {
        // LXCFS makes this working (cgroups are taken)
        var allocatable = node.status.allocatable; // allocatable = capacity - reserved
        var memory = utils_1["default"].memoryStringToBytes(allocatable.memory);
        return memory;
    };
    KindProvider.prototype.resizeCluster = function (workersNum) {
        if (this.initialized != true) {
            logger_1["default"].base.error("You have to call initialize() first.");
            return Error("Provider not initialized");
        }
        if (workersNum > this.workerNodesNames.length) {
            logger_1["default"].base.error("Too much workers requested.");
            return Error("Too much workers requested");
        }
        if (workersNum < 0) {
            logger_1["default"].base.error("Cluster size cannot be smaller than 0 worker.");
            return Error("Cluster size cannot be smaller than 0 worker");
        }
        if (this.nFirstWorkerNodesReady == workersNum) {
            // perfect num of nodes
            logger_1["default"].base.debug("No action necessary.");
        }
        else if (this.nFirstWorkerNodesReady < workersNum) {
            // add more nodes
            for (var i = this.nFirstWorkerNodesReady; i < workersNum; i++) {
                var nodeName = this.workerNodesNames[i];
                logger_1["default"].base.debug("Uncordoning node.");
                logger_1["default"].scaling.info('{"event":"creatingNode", "value":"' + nodeName + '"}');
                this.uncordonNode(nodeName);
                logger_1["default"].scaling.info('{"event":"nodeReady", "value":"' + nodeName + '"}');
            }
        }
        else {
            // remove nodes
            for (var i = workersNum; i < this.nFirstWorkerNodesReady; i++) {
                var nodeName = this.workerNodesNames[i];
                logger_1["default"].base.debug("Draining node.");
                logger_1["default"].scaling.info('{"event":"destroyingNode", "value":"' + nodeName + '"}');
                this.drainNode(nodeName);
                logger_1["default"].scaling.info('{"event":"nodeDeleted", "value":"' + nodeName + '"}');
            }
        }
        logger_1["default"].base.debug("Cluster resized to " + workersNum + " workers.");
        return;
    };
    KindProvider.prototype.getNumAllWorkers = function () {
        return this.workerNodesNames.length;
    };
    KindProvider.prototype.getNumReadyWorkers = function () {
        return this.nFirstWorkerNodesReady;
    };
    KindProvider.prototype.initializeCluster = function () {
        var _this = this;
        var promise = this.client.getWorkerNodes().then(function (nodeList) {
            var _a;
            if (nodeList instanceof Error) {
                return nodeList;
            }
            for (var _i = 0, nodeList_1 = nodeList; _i < nodeList_1.length; _i++) {
                var node = nodeList_1[_i];
                var name_1 = (_a = node === null || node === void 0 ? void 0 : node.metadata) === null || _a === void 0 ? void 0 : _a.name;
                if (name_1 == undefined) {
                    return Error("Unable to get metadata.name from node");
                }
                _this.workerNodesNames.push(name_1);
            }
            logger_1["default"].base.debug('Found ' + _this.workerNodesNames + 'workers');
            for (var i = 0; i < _this.workerNodesNames.length; i++) {
                var nodeName = _this.workerNodesNames[i];
                _this.uncordonNode(nodeName); // we want to be sure every woker node is schedulable
            }
            _this.initialized = true;
            logger_1["default"].base.debug("Cluster intitialized");
            return;
        });
        return promise;
    };
    KindProvider.prototype.uncordonNode = function (nodeName) {
        var result = child_process.exec('kubectl uncordon ' + nodeName);
        logger_1["default"].base.silly('Uncordon result: ' + result.toString());
        this.nFirstWorkerNodesReady += 1;
        return;
    };
    KindProvider.prototype.drainNode = function (nodeName) {
        var result = child_process.exec('kubectl drain --ignore-daemonsets ' + nodeName);
        logger_1["default"].base.silly('Drain result: ' + result.toString());
        this.nFirstWorkerNodesReady -= 1;
        return;
    };
    return KindProvider;
}(baseProvider_1["default"]));
exports["default"] = KindProvider;
