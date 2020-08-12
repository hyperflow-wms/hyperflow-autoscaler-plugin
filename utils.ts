import Loggers from './logger';

class Utils {
  static memoryStringToBytes(mem: string): number | Error  {
    Loggers.base.silly('Utils.memoryStringToBytes(' + mem + ')');
    let val: number = parseInt(mem, 10);
    let suffix: string = mem.substring(mem.length - 2);
    let power: number = 0;
    switch (suffix) {
      case "Ki":
        power = 10;
        break;
      case "Mi":
        power = 20;
        break;
      case "Gi":
        power = 30;
        break;
      case "Ti":
        power = 40;
        break;
      default:
        return Error("Unsupported suffix '" + suffix + "'");
    }
    return val * Math.pow(2, power);
  }

  static cpuStringToNum(cpu: string): number | Error {
    Loggers.base.silly('Utils.cpuStringToNum(' + cpu + ')');
    let val: number = parseInt(cpu, 10);
    let suffix: string = cpu.substring(cpu.length - 1);
    if (suffix == "m") {
      val = parseInt(val.toFixed(3)) / 1000;
    }
    return val;
  }
}

export default Utils;
