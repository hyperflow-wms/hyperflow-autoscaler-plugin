"use strict";
exports.__esModule = true;
var logger_1 = require("./logger");
var k8sClient_1 = require("./k8sClient");
var utils_1 = require("./utils");
var BaseProvider = /** @class */ (function () {
    function BaseProvider() {
        this.client = new k8sClient_1["default"]();
    }
    BaseProvider.prototype.getSupply = function () {
        var _this = this;
        var promise = this.client.getWorkerNodes().then(function (nodeList) {
            var _a, _b;
            if (nodeList instanceof Error) {
                return Error("Unable to get worker nodes:\n" + nodeList.message);
            }
            var totalCpu = 0;
            var totalMemory = 0;
            var schedulableNodes = 0;
            for (var _i = 0, nodeList_1 = nodeList; _i < nodeList_1.length; _i++) {
                var node = nodeList_1[_i];
                var allocatable = (_a = node === null || node === void 0 ? void 0 : node.status) === null || _a === void 0 ? void 0 : _a.allocatable; // allocatable = capacity - reserved
                if (allocatable == undefined) {
                    return Error("Unable to get status.allocatable from node");
                }
                var cpu = _this.getNodeCpu(node);
                if (cpu instanceof Error) {
                    return Error("Unable to get node's CPU status:\n" + cpu.message);
                }
                var memory = _this.getNodeMemory(node);
                if (memory instanceof Error) {
                    return Error("Unable to get node's memory status:\n" + memory.message);
                }
                var nodeName = (_b = node === null || node === void 0 ? void 0 : node.metadata) === null || _b === void 0 ? void 0 : _b.name;
                if (nodeName == undefined) {
                    return Error("Unable to get metadata.name from node");
                }
                logger_1["default"].base.debug('Node data: ' + nodeName + ' -> CPU: ' + cpu + ' RAM: ' + memory + ' bytes');
                var nodeSpec = node === null || node === void 0 ? void 0 : node.spec;
                if (nodeSpec == undefined) {
                    return Error("Unable to get spec from node");
                }
                var unschedulableProp = nodeSpec.unschedulable;
                if (unschedulableProp == true) {
                    logger_1["default"].base.debug("Unschedulable node here");
                }
                else {
                    schedulableNodes += 1;
                    totalCpu += cpu;
                    totalMemory += memory;
                }
            }
            logger_1["default"].base.debug("Found " + nodeList.length + " nodes (" + schedulableNodes + " schedulable)");
            logger_1["default"].base.debug("Total supply: " + totalCpu + ' ' + totalMemory);
            return [totalCpu, totalMemory];
        });
        return promise;
    };
    BaseProvider.prototype.getDemand = function () {
        var promise = this.client.getPods().then(function (res) {
            var _a, _b;
            var totalCpu = 0;
            var totalMemory = 0;
            var podList = res.body;
            for (var _i = 0, _c = podList.items; _i < _c.length; _i++) {
                var pod = _c[_i];
                var containers = (_a = pod === null || pod === void 0 ? void 0 : pod.spec) === null || _a === void 0 ? void 0 : _a.containers;
                if (containers == undefined) {
                    return Error("Unable to get spec.containers from pod");
                }
                for (var _d = 0, containers_1 = containers; _d < containers_1.length; _d++) {
                    var container = containers_1[_d];
                    //let limits = container.resources.limits;
                    var requests = (_b = container === null || container === void 0 ? void 0 : container.resources) === null || _b === void 0 ? void 0 : _b.requests;
                    if (requests == undefined) {
                        return Error("Unable to get resources.requests from container");
                    }
                    if (requests != undefined) {
                        if (requests.cpu != undefined) {
                            var cpu = utils_1["default"].cpuStringToNum(requests.cpu);
                            if (cpu instanceof Error) {
                                return Error("Unable to convert CPU string:\n" + cpu.message);
                            }
                            totalCpu += cpu;
                        }
                        if (requests.memory != undefined) {
                            var memory = utils_1["default"].memoryStringToBytes(requests.memory);
                            if (memory instanceof Error) {
                                return Error("Unable to convert memory string:\n" + memory.message);
                            }
                            totalMemory += memory;
                        }
                    }
                }
            }
            return [totalCpu, totalMemory];
        });
        return promise;
    };
    return BaseProvider;
}());
exports["default"] = BaseProvider;
