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
var baseProvider_1 = require("./baseProvider");
var utils_1 = require("./utils");
var GCPProvider = /** @class */ (function (_super) {
    __extends(GCPProvider, _super);
    function GCPProvider() {
        return _super.call(this) || this;
    }
    GCPProvider.prototype.getNodeCpu = function (node) {
        var allocatable = node.status.allocatable; // allocatable = capacity - reserved
        var cpu = utils_1["default"].cpuStringToNum(allocatable.cpu);
        return cpu;
    };
    GCPProvider.prototype.getNodeMemory = function (node) {
        var allocatable = node.status.allocatable; // allocatable = capacity - reserved
        var memory = utils_1["default"].memoryStringToBytes(allocatable.memory);
        return memory;
    };
    GCPProvider.prototype.resizeCluster = function (workersNum) {
        return Error("Not implemented yet");
    };
    GCPProvider.prototype.getNumAllWorkers = function () {
        return Error("Not implemented yet");
    };
    GCPProvider.prototype.getNumReadyWorkers = function () {
        return Error("Not implemented yet");
    };
    return GCPProvider;
}(baseProvider_1["default"]));
exports["default"] = GCPProvider;
