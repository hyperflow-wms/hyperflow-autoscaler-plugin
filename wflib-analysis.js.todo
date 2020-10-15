/* EXPORTED FUNCTIONS: */

function public_createInstanceFromFile(filename, baseUrl, config, cb) { // createInstanceFromFile
  // loads json data from filename then fill it with config
  // call public_createInstance(jsonData, baseUrl, cb)
}

function public_createInstance(wfJson, baseUrl, cb) { // createInstance
  // creates workflow instance in hyperflow
  // puts a lot of data in redis, not really matter
}

function public_getWfInfo(wfName, cb) { // getWfInfo
  // this function is empty!
}

function public_getWfInstanceInfo(wfId, cb) { // getWfInstanceInfo
  // fetches wf status, number of data and tasks
  // return value example:
  //    {uri: '/apps/5', status: 'running', nTasks: 44, nData: 98}
}

function public_setWfInstanceState(wfId, obj, cb) { // setWfInstanceState
  // stores/updates obj in wf instance info (hashmap), eg. {"status": "running"}
}

function public_getWfTasks(wfId, from, to, cb) { // getWfTasks
  // queries redis to fetch task details
  // returns few arrays - one with task details, eg.
  //   [{"uri":null,"name":"mBackground","status":"waiting","fun":"k8sCommand"}, ...]
  // and there is array with (data?), ins and outs.
}

function public_getWfIns(wfId, withports, cb) { // getWfIns
  // queries redis to fetch all wf ins
  // return value when withports = true:
  //    ['1', '1', '4', '2', '5', '3', '8', '4', '11', '5', '14', '6', '17', '7', '20', '8', '23', '9', '26', '10', '29', '11', '32', '12', '33', '13', '68', '14', '70', '15', '92', '16', '94', '17']
  // return value when withprots = false:
  //    ['1', '4', '5', '8', '11', '14', '17', '20', '23', '26', '29', '32', '33', '68', '70', '92', '94']
}

function public_getWfOuts(wfId, withports, cb) { // getWfOuts
  // queries redis to fetch all wf outs
  // return value when withports = true:
  //    ['35', '1', '37', '2', '39', '3', '41', '4', '43', '5', '45', '6', '47', '7', '49', '8', '51', '9', '53', '10', '55', '11', '57', '12', '59', '13', '61', '14', '63', '15', '65', '16', '67', '17', '96', '18', '98', '19']
  // return value when withprots = false:
  //    ['35', '37', '39', '41', '43', '45', '47', '49', '51', '53', '55', '57', '59', '61', '63', '65', '67', '96', '98']
}

function public_getTaskInfo(wfId, procId, cb) { // getTaskInfo
  // fetches all task info from redis
  //
  // this seems to be great function for autoscaler!!!
  //
  // return value for procId == 43: {
  //  config:'{"containername":"koxu1996/hf_montage_worker","executor":{"executable":"mViewer","args":["-ct","1","-gray","shrunken_20180402_165339_22325.fits","0","100","gaussianlog","-out","shrunken_20180402_165339_22325.jpg"]}}'
  //  firingLimit:'1'
  //  fun:'k8sCommand'
  //  function:'k8sCommand'
  //  ins:'1'
  //  name:'mViewer'
  //  outs:'1'
  //  status:'waiting'
  //  type:'dataflow'
  //  wfname:'MontageWorkflow0.25'
  //}
}

function popInput(wfId, procId, sigId, cb) { // popInput
  // this seems to fetch details about signal state of given procId
  // note infromation that signal is ready is popped!!!
  //
  // example return value for procId == 1:
  //  {
  //    name: "2mass-atlas-001124n-j0880044.fits",
  //    _id: 1,
  //    _ts: 2840,
  //    data: [
  //      {
  //      },
  //    ],
  //    sigIdx: 1,
  //  }
}

function resetStickyPorts(wfId, procId, cb) { // resetStickyPorts
  // this seems to modify WF state, I don't want to use such functions
}

function public_setTaskState(wfId, procId, obj, cb) { // setTaskState
  // similar to setWfInstanceState but for task-scope
  // with given obj, eg. {'status': 'running'} the redis state of procId is updated
}

function public_getDataInfo(wfId, dataId, cb) { // getDataInfo
  // queries redis for data info
  // example return for dataId == 10:
  //   {
  //    name: "p2mass-atlas-001124n-j0880032_area.fits",
  //    nSources: 1,
  //    nSinks: 6,
  //   }

}

function public_getDataInfoFull(wfId, dataId, cb); { // getDataInfoFull
  // fetches details of given data id like name, sources and sinks
  //
  // this seems to be very useful for autoscaler
  //
  // example return values for dataId == 10:
  // data = {
  //   name: "p2mass-atlas-001124n-j0880032_area.fits",
  // }
  // sources = [
  //   {
  //     uri: null,
  //     name: "mProjectPP",
  //     status: "waiting",
  //   },
  // ]
  // sinks = [
  // [
  //   {
  //     uri: null,
  //     name: "mDiffFit",
  //     status: "waiting",
  //   },
  //   {
  //     uri: null,
  //     name: "mDiffFit",
  //     status: "waiting",
  //   },
  //   {
  //     uri: null,
  //     name: "mDiffFit",
  //     status: "waiting",
  //   },
  //   {
  //     uri: null,
  //     name: "mDiffFit",
  //     status: "waiting",
  //   },
  //   {
  //     uri: null,
  //     name: "mDiffFit",
  //     status: "waiting",
  //   },
  //   {
  //     uri: null,
  //     name: "mBackground",
  //     status: "waiting",
  //   },
  // ]
}

function getSignalInfo(wfId, sigs, cb) { // getSignalInfo
  // worse version of getDataInfoFull, fetching less info
  //
  // example return values for sigs = [10, 11]:
  //[
  //  {
  //    name: "p2mass-atlas-001124n-j0880032_area.fits",
  //    _id: 10,
  //    id: 10,
  //  },
  //  {
  //    name: "diff.000002.000008.fits",
  //    _id: 43,
  //    id: 43,
  //  },
  //]
}

function getSigByName(wfId, sigName, cb) { // getSigByName
  // fetches signal id by signal name
  // reverse function of getSignalInfo
  //
  // example return value for sigName == 'diff.000002.000008.fits':
  //    '43'
}

function fetchInputs(wfId, procId, sigsSpec, deref, cb) { // fetchInputs
  // fetches specified input signals and checks if they are all ready
  // boolean value is returned (+signals in case of deref == true)
  //
  // warning: it uses popInputs, so beware of every invocation
}

function public_setDataState(wfId, spec, cb) { // setDataState
  // stores/updates obj in multiple 'data' (different keys), eg.
  //    { "1": { "status": "ready", "value": "33" }, ... }
  //
  // does not seem to be used at all, not usefull
}

function public_getWfMap(wfId, cb) { // getWfMap
  // fetches a lot of task details
  //
  // looks awesome
  //
  // example output: {  
  // nProcs: 44
  // nSigs: 98
  // ins: [["1", "4"], ["5","4"], ...]
  // outs: [["2", "3"], ["6", "7"], ...]
  // sources: [[], ['1', '1'], ['1', '2'], ...]
  // sinks: []     <- this is not expected, function is commented out inside!
  // types: {dataflow: ['1','2', ...], csplitter: [], ...}
  // cPortsInfo: {}
  // fullInfo: [{
  //   name: "mProjectPP",
  //   fun: "k8sCommand",
  //   type: "dataflow",
  //   status: "waiting",
  //   outs: "2",
  //   config: "{\"containername\":\"koxu1996/hf_montage_worker\",\"executor\":{\"executable\":\"mProjectPP\",\"args\":[\"-X\",\"-x\",\"0.90423\",\"2mass-atlas-001124n-j0880044.fits\",\"p2mass-atlas-001124n-j0880044.fits\",\"big_region_20180402_165339_22325.hdr\"]},\"jobAgglomerations\":[{\"matchTask\":[\"mProjectPP\",\"mDiffFit\"],\"size\":3,\"timeoutMs\":3000},{\"matchTask\":[\"mBackground\"],\"size\":5,\"timeoutMs\":2500}]}",
  //   function: "k8sCommand",
  //   firingLimit: "1",
  //   ins: "2",
  //   wfname: "MontageWorkflow0.25",
  //   cinset: {
  //   },
  //   coutset: {
  //   },
  //   incounts: null,
  //   outcounts: null,
  // }, ...]
  // }
}

function public_getTaskMap(wfId, procId, cb) { // getTaskMap
  // fetches task details: ins, outs, sources and sinks!
  //
  // AWESOME FUNCTION
  //
  // example return value for procId == 30:
  //  ins: ['2', '3', '70', '71']
  //  outs: ['72', '73']
  //  sources: {"2": ["1","1"], "3": ["1","2"], "70": [], "71": ["29","1"]}
  //  sinks: {"72": ["40","2","41","3"], "73": ["41","4"]}
}

function public_getDataSources(wfId, dataId, cb) { // getDataSources
  // fetches sources for data (NOT task!)
  //
  // return value for dataId == 72:
  //   ["30","1"]
}

function public_getDataSinks(wfId, dataId, withports, cb) { // getDataSinks
  // fetches sinks for data (NOT task!)
  //
  // return value for dataId == 72, withports == true:
  //   ["40", "2", "41", "3"]
  // return value for dataId == 72, withports == false:
  //   ["40", "41"]
}

// IDEA:
// tasks are sources and sinks for data !?

function public_getRemoteDataSinks(wfId, dataId, cb) { // getRemoteDataSinks
  // this should be similar to public_getDataSinks, but it's bugged and not implemented fully!
}

function public_invokeProcFunction(wfId, procId, firingId, insIds_, insValues, outsIds_, emulate, eventServer, appConfig, cb) { // invokeProcFunction
  // quite complex function:
  //  - fetches and calculate incremented value of datas (outsIds_)
  //  - invokes function
  //
  // it's migth be source of logic analysis, but I won't use it in autoscaler in any way
}

function getInitialSignals(wfId, cb) { // getInitialSigs
  // fetches list of initial signals
  //
  // example return value:
  // [
  //   {name: "2mass-atlas-001124n-j0880044.fits", data: [{}], _id: 1},
  //   {name: "big_region_20180402_165339_22325.hdr", data: [{}], _id: 4}
  // ]
}

function sendSignalLua(wfId, sig, cb) { // sendSignal
  // pushes signal to queue at something like task:PROCID:SIG
  // does not seem to be useful
}

function getSigRemoteSinks(wfId, sigId, cb) { // getSigRemoteSinks
  // get list of remote signals
  // not used in my base case when I run normal workflows
}

function setSigRemoteSinks(wfId, sigId, remoteSinks, options, cb) { // setSigRemoteSinks
  // something with remote sigs,
  // I don't care...
}


/* EXPORTED MEMBERS: */

// hyperflow ID, eg. lspcIn1Jf:
const global_hfid; // hfid


/* (WAS-)HIDDEN METHODS: */
function public_getWfInsAndOutsInfoFull(wfId, cb) { // getWfInsAndOutsInfoFull
  // fetch array of ins and outs with objects like below:
  //   {
  //     uri: null,
  //     name: "2mass-atlas-001124n-j0880044.fits",
  //     status: null,
  //   }
}

function public_getTaskIns(wfId, procId, withports, cb) { // getTaskIns
  // fetches task ins
  //
  // example return value for procId == 40, withports == false:
  // ["92", "72", "74", ...]
  // example return value for procId == 40, withports == true:
  // ["92", "1", "72", "2", "74", "3", ...]
}

function public_getTaskOuts(wfId, procId, withports, cb) { // getTaskOuts
  // smiliar to getTaskIns
  //
  // example return value for procId == 40, withports == false:
  //  ["93"]
  // example return value for procId == 40, withports == true:
  //  ["93", "1"]
}

function pushInput(wfId, procId, sigId, sigIdx, cb) {
  // probably used to push signal id in sink queues
  // not useful for me
}

function public_sendSignal(wfId, sigValue, cb) { // sendSignal
  // could be designed for emitting signals, but it's commented out
  // little useful for logic analysis
}

function getStickySigs(wfId, procId, cb) {
  // fetches list of sticky signals for given task
  //
  // I don't care and need it
}

function public_getInsIfReady(wfId, procId, spec, cb) {
  // checks if all signals with specified ids are ready for a given task; if so, returns their values
  // similar to fetchInputs but without making popInput!
}

function getTasks1(wfId, from, to, dataNum, cb) {
  // queries redis for tasks details
  // internal function used in public_getWfTasks - refer to it
}
