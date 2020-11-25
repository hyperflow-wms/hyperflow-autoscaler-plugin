import GCPBillingModel from "./cloud/gcpBillingModel";
import { GCPMachines, N1_HIGHCPU_4 } from "./cloud/gcpMachines";
import StaticProcessEstimator from "./hyperflow/estimators/staticProcessEstimator";
import WorkflowTracker from "./hyperflow/tracker/tracker";
import Workflow from "./hyperflow/tracker/workflow";
import Plan from "./hyperflow/workflow/plan";
import ScalingDecision from "./hyperflow/workflow/scalingDecision";
import ScalingOptimizer from "./hyperflow/workflow/scalingOptimizer";
import ResourceRequirements from "./kubernetes/resourceRequirements";

type timestamp = number;

let wfDir = './assets/wf_montage_0.25';
let workflow = Workflow.createFromFile(wfDir);

let wfTracker = new WorkflowTracker(workflow);
let maxPlanTimeMs: number = 300000;
let estimator = new StaticProcessEstimator();
let currentWorkers = 8;
let machineType = GCPMachines.makeObject(N1_HIGHCPU_4);
let PROVISIONING_MACHINE_AVG_TIME = 120 * 1000;

// 1. Planning
let beforePlanTime: timestamp = new Date().getTime();
let plan = new Plan(workflow, wfTracker, maxPlanTimeMs, estimator);
plan.run(); // 8 KB
let demandFrames = plan.getDemandFrames();

let startTime = 1000002840000;
let endTime = 1000003140000;

////{"level":50,"time":1605354318878,"pid":58,"hostname":"demo-deployment-hyperflow-777c59d7c5-drrlg","demandBaseline":[[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408]]}
////{"level":50,"time":1605354318886,"pid":58,"hostname":"demo-deployment-hyperflow-777c59d7c5-drrlg","msg":"[ScalingOptimizer] Best descision found: -2 after 0 ms., score = 2.048258407949816"}
////{"level":50,"time":1605354318886,"pid":58,"hostname":"demo-deployment-hyperflow-777c59d7c5-drrlg","scalingResults":[[0,1.3939244842169054,0.07084859999999998],[-5,1.0146978420820314,0.023616199999999997],[-4,1.0413439424189328,0.03306268],[-3,1.1120862913567682,0.04250915999999999],[-2,2.048258407949816,0.05195564],[-1,1.652306838821133,0.06140212],[1,1.274607242918,0.08265669999999999],[2,1.1765866228387971,0.09446479999999999]]}
////{"level":30,"time":1605354318886,"pid":58,"hostname":"demo-deployment-hyperflow-777c59d7c5-drrlg","msg":"[Engine] Scaling down from 6 to 4 machines"}

//let baseLineArr = [[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408],[37986,10197844408]];
//let baseLine = new Map<number, ResourceRequirements>();
//let timeKey = startTime;
//baseLineArr.forEach((val) => {
//  baseLine.set(timeKey, new ResourceRequirements({cpu: val[0].toString() + "m", mem: val[1].toString()}));
//  timeKey += 1000*10;
//});

let optimizer = new ScalingOptimizer(6, machineType, PROVISIONING_MACHINE_AVG_TIME, maxPlanTimeMs, new GCPBillingModel());
////for (let i = 2; i >= -5; i--) {
////  console.log('\n\n# Scaling from 6 to ' + (6+i).toString() + ' (' + i.toString() + ') after 3min.\n');
////  let option = optimizer.calculateScalingResult(baseLine, startTime, endTime, i, startTime + 0*1000);
////  let result = option.getScore({skipOverProvision: false});
////}
optimizer.findBestDecision(beforePlanTime+100000, demandFrames);

console.log("Done!");
