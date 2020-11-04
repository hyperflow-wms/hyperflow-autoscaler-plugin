import MachineType from "./machine"
import { MachinesSpecsMap } from "./machines";

const N1_HIGHCPU_2 = "n1_highcpu_2";
const N1_HIGHCPU_4 = "n1_highcpu_4";
const N1_HIGHCPU_8 = "n1_highcpu_8";
const N1_HIGHCPU_16 = "n1_highcpu_16";
const N1_HIGHCPU_32 = "n1_highcpu_32";
const N1_HIGHCPU_64 = "n1_highcpu_64";
const N1_HIGHCPU_96 = "n1_highcpu_96";

/* Table of allocatable resources.
 * See: https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-architecture */
const specsMap: MachinesSpecsMap = {
  [N1_HIGHCPU_2]: {cpu: "1.93", memory: "1.3G"},
  [N1_HIGHCPU_4]: {cpu: "3.92", memory: "2.6G"},
  [N1_HIGHCPU_8]: {cpu: "7.91", memory: "5.5G"},
  [N1_HIGHCPU_16]: {cpu: "15.89", memory: "11.9G"},
  [N1_HIGHCPU_32]: {cpu: "31.85", memory: "25.3G"},
  [N1_HIGHCPU_64]: {cpu: "63.77", memory: "52.5"},
  [N1_HIGHCPU_96]: {cpu: "95.69", memory: "79.6"},
}

class GCPMachines
{
  public static makeObject(name: string) {
    if (! (name in specsMap) ) {
      throw Error("Machine " + name + " not found in specification");
    }
    let spec = specsMap[name];

    let machine = new MachineType({name: name, cpu: spec.cpu, memory: spec.memory});
    return machine;
  }
}

export {
  N1_HIGHCPU_2,
  N1_HIGHCPU_4,
  N1_HIGHCPU_8,
  N1_HIGHCPU_16,
  N1_HIGHCPU_32,
  N1_HIGHCPU_64,
  N1_HIGHCPU_96,
  specsMap,
  GCPMachines
};
