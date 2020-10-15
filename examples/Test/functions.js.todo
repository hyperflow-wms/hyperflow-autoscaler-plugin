//function sqr(ins, outs, config, cb) {
//    var n = Number(ins.number.data[0]);
//    outs.square.data = [n * n];
//    setTimeout(function() {
//        cb(null, outs);
//    }, Math.random() * 3000);
//}

//function sum(ins, outs, config, cb) {
//    var sum=0.0;
//    ins.square.data.forEach(function (n) {
//        sum += n;
//    });
//    outs[0].data = [ sum ];
//    console.log(sum);
//    cb(null, outs);
//}

let runCounter = 0;

async function k8sCommand(ins, outs, config, cb) {
    runCounter++;
    console.log(runCounter.toString() + "th invocation of k8Command");
    await new Promise((res, rej) => { setTimeout(res, 5000); })
    cb(null, outs);
    return;
}

// from functions.index
function exit(ins, outs, config, cb) {
    console.log("Exiting\n\n");
    process.exit(0);
}

exports.k8sCommand = k8sCommand;
exports.exit = exit;
