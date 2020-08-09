"use strict";
exports.__esModule = true;
var Utils = /** @class */ (function () {
    function Utils() {
    }
    Utils.memoryStringToBytes = function (mem) {
        var val = parseInt(mem, 10);
        var suffix = mem.substring(mem.length - 2);
        var power = 0;
        switch (suffix) {
            case "Ki":
                power = 10;
                break;
            case "Mi":
                power = 20;
                break;
            case "Gi":
                power = 30;
                break;
            case "Ti":
                power = 40;
                break;
            default:
                return Error("Unsupported suffix '" + suffix + "'");
        }
        return val * Math.pow(2, power);
    };
    Utils.cpuStringToNum = function (cpu) {
        var val = parseInt(cpu, 10);
        var suffix = cpu.substring(cpu.length - 1);
        if (suffix == "m") {
            val = parseInt(val.toFixed(3)) / 1000;
        }
        return val;
    };
    return Utils;
}());
exports["default"] = Utils;
