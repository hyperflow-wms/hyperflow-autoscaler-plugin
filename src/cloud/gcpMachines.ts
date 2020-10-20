import MachineType from "./machine"
import { MachinesSpecsMap } from "./machines";

const N1_HIGHCPU_2 = "n1_highcpu_2";
const N1_HIGHCPU_4 = "n1_highcpu_4";
const N1_HIGHCPU_8 = "n1_highcpu_8";
const N1_HIGHCPU_16 = "n1_highcpu_16";
const N1_HIGHCPU_32 = "n1_highcpu_32";
const N1_HIGHCPU_64 = "n1_highcpu_64";
const N1_HIGHCPU_96 = "n1_highcpu_96";

const specsMap: MachinesSpecsMap = {
  [N1_HIGHCPU_2]: {cpu: "2", memory: "1.8G"},
  [N1_HIGHCPU_4]: {cpu: "4", memory: "3.6G"},
  [N1_HIGHCPU_8]: {cpu: "8", memory: "7.2G"},
  [N1_HIGHCPU_16]: {cpu: "16", memory: "14.4G"},
  [N1_HIGHCPU_32]: {cpu: "32", memory: "28.8G"},
  [N1_HIGHCPU_64]: {cpu: "64", memory: "57.6G"},
  [N1_HIGHCPU_96]: {cpu: "96", memory: "86.4G"},
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
