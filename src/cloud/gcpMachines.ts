import MachineType from "./machine"

let n1_highcpu_2 = new MachineType({
  "name": "n1-highcpu-2",
  "cpu": "2",
  "memory": "1.8G",
});

let n1_highcpu_4 = new MachineType({
  "name": "n1-highcpu-4",
  "cpu": "4",
  "memory": "3.6G",
});

let n1_highcpu_8 = new MachineType({
  "name": "n1-highcpu-8",
  "cpu": "8",
  "memory": "7.2G",
});

let n1_highcpu_16 = new MachineType({
  "name": "n1-highcpu-16",
  "cpu": "16",
  "memory": "14.4G",
});

let n1_highcpu_32 = new MachineType({
  "name": "n1-highcpu-32",
  "cpu": "32",
  "memory": "28.8G",
});

let n1_highcpu_64 = new MachineType({
  "name": "n1-highcpu-64",
  "cpu": "64",
  "memory": "57.6G",
});

let n1_highcpu_96 = new MachineType({
  "name": "n1-highcpu-96",
  "cpu": "96",
  "memory": "86.4G",
});

export {
  n1_highcpu_2,
  n1_highcpu_4,
  n1_highcpu_8,
  n1_highcpu_16,
  n1_highcpu_32,
  n1_highcpu_64,
  n1_highcpu_96,
};
