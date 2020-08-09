"use strict";
exports.__esModule = true;
var API = /** @class */ (function () {
    function API(rcl, wflib, plugins) {
        this.rcl = rcl;
        this.wflib = wflib;
        this.plugins = plugins;
    }
    API.prototype.addNumbers = function (a, b) {
        console.log('addNumbers', a, b);
        return a + b;
    };
    return API;
}());
exports["default"] = API;
