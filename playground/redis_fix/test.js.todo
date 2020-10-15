const randomWfID = (Math.random() * 99999999).toString();

const redis = require('redis');



// k8sJobSubmit.js + handler.js

async function submitK8sJob(taskId, context) {
  console.log("Started task", taskId);

  await context.jobResult(0, taskId);

  console.log("Finished task", taskId);
  return;
}


// k8sCommand.js

let rclEX = redis.createClient('redis://127.0.0.1:6379');

class RemoteJobConnector {
    constructor(redisClient, wfId) {
        if (!(this instanceof RemoteJobConnector)) {
            return new RemoteJobConnector(redisClient, wfId);
        }
        this.rcl = redisClient;
        this.queueKey = "wf:" + wfId + ":completedTasks";
    }

    async notifyJobCompletion(taskId, code) {
        console.log("[RemoteJobConnectorM] Additing result", code, "of task", taskId);
        await new Promise((resolve, reject) => {
            this.rcl.sadd(taskId, code, function (err, reply) {
                err ? reject(err): resolve(reply);
            });
        });
        console.log("[RemoteJobConnectorM] Marking task", taskId, "as completed");
        return new Promise((resolve, reject) => {
            this.rcl.sadd(this.queueKey, taskId, function (err, reply) {
                err ? reject(err): resolve(reply);
            });
        });
    }
}

let jcw = new RemoteJobConnector(rclEX, randomWfID);

async function k8sCommand(arrTasks, context, cb) {

  jobsPromises = [];
  for (let i=0; i<arrTasks.length; i++) {
    let taskId = arrTasks[i];
    jobsPromises.push(submitK8sJob(taskId, context));
  }

  // simulate handler.js exectuions
  for (let i=0; i<arrTasks.length; i++) {
    let taskId = arrTasks[i];
    let workloadTime = 1000 + Math.floor(Math.random() * 4000);
    setTimeout(() => {
        jcw.notifyJobCompletion(taskId, 0);
    }, workloadTime);
  }

  await Promise.all(jobsPromises);

  cb();
}


//// wflib

//call multiple k8sCommand, without await


/* CUSTOM NEW GRABBER */

class RemoteJobConnectorM {
    constructor(redisClient, wfId, checkInterval) {
        this.jobPromiseResolves = {};
        this.rcl = redisClient;
        this.running = false;
        this.queueKey = "wf:" + wfId + ":completedTasks";
        this.checkInterval = checkInterval;
    }

    // synchronous function that gives you promise!
    waitForTask(taskId, cb) {
        if (this.jobPromiseResolves[taskId] !== undefined) {
            console.error("[RemoteJobConnectorM] Task", taskId, "is already observed");
            return;
        }
        console.log("[RemoteJobConnectorM] Waiting for task", taskId);
        let promise = new Promise((resolve, reject) => {
            this.jobPromiseResolves[taskId] = resolve;
        });

        return promise;
    }

    async run() {
        this.running = true;
        while (true) {
            if (this.running == false) {
                console.log("[RemoteJobConnectorM] Stopping");
                break;
            }

            let taskId = null;
            try {
                taskId = await new Promise((resolve, reject) => {
                    this.rcl.srandmember(this.queueKey, function(err, reply) {
                        err ? reject(err): resolve(reply);
                    });
                });
            } catch (error) {
                console.error("[RemoteJobConnectorM] Unable to fetch new complated jobs", error);
            }

            if (taskId == null) {
                await new Promise((resolve) => setTimeout(resolve, this.checkInterval));
                continue;
            }

            console.log("[RemoteJobConnectorM] Got completed job:", taskId);

            let taskResult = null;
            try {
                taskResult = await new Promise((resolve, reject) => {
                    this.rcl.spop(taskId, function(err, reply) {
                        err ? reject(err): resolve(reply);
                    });
                });
            } catch (error) {
                console.error("[RemoteJobConnectorM] Unable to get result of job", taskId);
                continue;
            }

            if (this.jobPromiseResolves[taskId] === undefined) {
                console.error("[RemoteJobConnectorM] Observer for task", taskId, "not found");
                continue;
            }
            let promiseResolve = this.jobPromiseResolves[taskId];
            delete this.jobPromiseResolves[taskId];

            try {
                await new Promise((resolve, reject) => {
                    this.rcl.srem(this.queueKey, taskId, function(err, reply) {
                        err ? reject(err): resolve(reply);
                    });
                });
            } catch (error) {
                console.error("[RemoteJobConnectorM] Unable to delete job from completed queue", error);
            }

            console.log("[RemoteJobConnectorM] Resolving promise for task", taskId, "| result =", taskResult);
            promiseResolve(taskResult);
        }

        return;
    }

    async stop() {
        console.log("[RemoteJobConnectorM] Requesting stop");
        this.running = false;
        return;
    }
}


let rclHF = redis.createClient('redis://127.0.0.1:6379');

let jcm = new RemoteJobConnectorM(rclHF, randomWfID, 3000);
jcm.run();

// TODO jcm.quit();   (maybe on function exit?)


let context = {};

context.jobResult = async function(timeout, taskId) {
  return jcm.waitForTask(taskId);
}

k8sCommand(['hf:1', 'hf:2', 'hf:3'], context, () => {
  k8sCommand(['hf:11', 'hf:12', 'hf:21', 'hf:22', 'hf:31', 'hf:32'], context, () => {})
});
k8sCommand(['hf:4', 'hf:5', 'hf:6'], context, () => {
  k8sCommand(['hf:41', 'hf:51', 'hf:61'], context, () => {
    k8sCommand(['hf:100', 'hf:200'], context, () => {})
  })
});
k8sCommand(['hf:7'], context, () => {
  k8sCommand(['hf:71', 'hf:72', 'hf:73'], context, () => {})
});



//EXIT CODES????? 2 return types: jobResult (exit code), checkCompleted (bool)
