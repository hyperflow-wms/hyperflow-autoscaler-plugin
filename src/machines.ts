export interface MachineSpec {
  name: string;
  cpu: number; // millis
  mem: number; // bytes
  price: number; // USD per hours
}

let n1_highcpu_4: MachineSpec = {
  "name": "n1-highcpu-4",
  "cpu": 4 * 1000,
  "mem": 3.6 * Math.pow(10, 9),
  "price": 0.1416972, // us-central-1
};

let n1_highcpu_8: MachineSpec = {
  "name": "n1-highcpu-8",
  "cpu": 8 * 1000,
  "mem": 7.2 * Math.pow(10, 9),
  "price": 0.2833944, // us-central-1
};

export { n1_highcpu_4, n1_highcpu_8 };
