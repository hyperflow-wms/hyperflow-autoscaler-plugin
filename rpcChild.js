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
var rpc_1 = require("./rpc");
var ChildRPC = /** @class */ (function (_super) {
    __extends(ChildRPC, _super);
    function ChildRPC(api_object) {
        var _this = _super.call(this, api_object) || this;
        _this.parent_process = process;
        return _this;
    }
    ChildRPC.prototype.sendRemote = function (data) {
        if (process.send === undefined) {
            return Error("ChildRPC cannot be used on root process");
        }
        process.send(data);
        return;
    };
    return ChildRPC;
}(rpc_1["default"]));
exports["default"] = ChildRPC;
