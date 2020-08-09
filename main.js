"use strict";
var api_1 = require("./api");
var rpcParent_1 = require("./rpcParent");
var child_process = require("child_process");
function runAutoscaler(rcl, wflib, plugins) {
    /* Create API, engine process and bind it via RPC. */
    var api = new api_1["default"](rcl, wflib, plugins);
    var engineProcess = child_process.fork(__dirname + '/engine.js');
    var rpc = new rpcParent_1["default"](engineProcess, api);
    rpc.init();
    return;
}
module.exports = {
    run: runAutoscaler
};
