"use strict";
exports.__esModule = true;
var k8s = require("@kubernetes/client-node");
var K8sClient = /** @class */ (function () {
    function K8sClient() {
        var kc = new k8s.KubeConfig();
        kc.loadFromDefault();
        this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
    }
    K8sClient.prototype.getWorkerNodes = function () {
        var promise = this.coreApi.listNode().then(function (res) {
            var _a;
            var workerNodes = [];
            var items = res.body.items;
            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                var node = items_1[_i];
                var labels = (_a = node === null || node === void 0 ? void 0 : node.metadata) === null || _a === void 0 ? void 0 : _a.labels;
                if (labels == undefined) {
                    return Error("Node does not contain labels");
                }
                var masterLabel = labels['node-role.kubernetes.io/master'];
                var hfMasterLabel = labels['nodeType'];
                // skip cluster control-plane and worker designated for hyperflow stack
                if (masterLabel == undefined && hfMasterLabel == undefined) {
                    continue;
                }
                workerNodes.push(node);
            }
            return workerNodes;
        });
        return promise;
    };
    K8sClient.prototype.getPods = function (namespace) {
        if (namespace === void 0) { namespace = 'default'; }
        var promise = this.coreApi.listNamespacedPod('default');
        return promise;
    };
    return K8sClient;
}());
exports["default"] = K8sClient;
