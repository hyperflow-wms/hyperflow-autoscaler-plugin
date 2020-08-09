"use strict";
exports.__esModule = true;
var MESSAGE_TYPE_REQUEST = 1;
var MESSAGE_TYPE_REPLY = 2;
var RPC = /** @class */ (function () {
    function RPC(api_object) {
        this.callback_map = {};
        this.api_object = api_object;
    }
    RPC.prototype.handleRequest = function (req) {
        var fn = this.api_object[req.fn];
        if (fn === undefined) {
            console.error("FATAL: No '" + req.fn + "' function registred");
            process.exit(1);
        }
        var args = req.args;
        if (args.length > fn.length) {
            console.error("FATAL: Too much args for '" + req.fn + "' - only " + fn.length + " expected");
            process.exit(1);
        }
        var result = fn.apply(this.api_object, req.args);
        var callId = req.id;
        this.sendRemote({
            id: callId,
            type: MESSAGE_TYPE_REPLY,
            content: result
        });
        return;
    };
    RPC.prototype.handleReply = function (rep) {
        var callId = rep.id;
        if (this.callback_map[callId] === undefined) {
            console.error(process.pid, "FATAL: Callback for call-" + callId + "' is not set");
            process.exit(1);
        }
        var cb_copy = this.callback_map[callId];
        delete this.callback_map[callId];
        var content = rep.content;
        cb_copy(content);
    };
    RPC.prototype.handleMessage = function (data) {
        if (typeof data !== 'object') {
            console.log("No valid RPC message - skipping");
            return;
        }
        if (data['type'] === MESSAGE_TYPE_REQUEST) {
            this.handleRequest(data);
            return;
        }
        else if (data['type'] === MESSAGE_TYPE_REPLY) {
            this.handleReply(data);
            return;
        }
        console.log("No valid RPC message - skipping");
        return;
    };
    RPC.prototype.call = function (fn_name, args, cb) {
        var randomId = Math.random().toString(36).substr(2, 9);
        this.sendRemote({
            id: randomId,
            type: MESSAGE_TYPE_REQUEST,
            fn: fn_name,
            args: args
        });
        if (this.callback_map[randomId] !== undefined) {
            return Error("Callback is already set!");
        }
        this.callback_map[randomId] = cb;
        return;
    };
    RPC.prototype.init = function () {
        var _this = this;
        process.on('message', function (data) {
            _this.handleMessage(data);
        });
        return;
    };
    return RPC;
}());
exports["default"] = RPC;
