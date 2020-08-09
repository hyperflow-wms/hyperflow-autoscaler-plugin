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
var ParentRPC = /** @class */ (function (_super) {
    __extends(ParentRPC, _super);
    function ParentRPC(child_process, api_object) {
        var _this = _super.call(this, api_object) || this;
        _this.child_process = child_process;
        return _this;
    }
    ParentRPC.prototype.sendRemote = function (data) {
        this.child_process.send(data);
        return;
    };
    ParentRPC.prototype.init = function () {
        var _this = this;
        _super.prototype.init.call(this);
        this.child_process.on('message', function (data) {
            _this.handleMessage(data);
        });
        return;
    };
    return ParentRPC;
}(rpc_1["default"]));
exports["default"] = ParentRPC;
