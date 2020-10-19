import ResourceRequirements from "../../kubernetes/resourceRequirements";

class ScalingResult
{
  private price?: number;

  private totalCpuSupply: number = 0;
  private totalCpuUnderprovisionDemand: number = 0;
  private totalCpuOverprovisionDemand: number = 0;

  private totalMemSupply: number = 0;
  private totalMemUnderprovisionDemand: number = 0;
  private totalMemOverprovisionDemand: number = 0;

  private totalFrames: number;

  public constructor() {
    this.totalFrames = 0;
  }

  /**
   * Setter for price.
   * @param price
   */
  public setPrice(price: number): void {
    this.price = price;
    return;
  }

  /**
   * Getter for price.
   */
  public getPrice(): number {
    if (this.price === undefined) {
      throw Error("Price is not set");
    }
    return this.price;
  }

  /**
   * Getter for totalFrames.
   */
  public getFramesAmount(): number {
    return this.totalFrames;
  }

  /**
   * Feed object with frame, that will affect score.
   * @param supply
   * @param demand
   */
  public addFrame(supply: ResourceRequirements, demand: ResourceRequirements): void {

    /* Increase total counters. */
    this.totalCpuSupply += supply.getCpuMillis();
    this.totalMemSupply += supply.getMemBytes();
    this.totalFrames += 1;

    /* Count CPU under/overprovisioning. */
    if (demand.getCpuMillis() > supply.getCpuMillis()) {
      this.totalCpuUnderprovisionDemand += demand.getCpuMillis();
    } else if (demand.getCpuMillis() < supply.getCpuMillis()) {
      this.totalCpuOverprovisionDemand += demand.getCpuMillis();
    }
    /* Count memory under/overprovisioning. */
    if (demand.getMemBytes() > supply.getMemBytes()) {
      this.totalMemUnderprovisionDemand += demand.getMemBytes();
    } else if (demand.getMemBytes() < supply.getMemBytes()) {
      this.totalMemOverprovisionDemand += demand.getMemBytes();
    }

    return;
  }

  /**
   * Caclulates score based on feeded frames.
   * The better option, the bigger score.
   *
   * TODO: Think if 0 is great default value
   */
  public getScore(): number {
    /* Base scores. */
    let cpuUnderScore = 0;
    if (this.totalCpuUnderprovisionDemand != 0) {
      cpuUnderScore = ((this.totalCpuSupply / this.totalCpuUnderprovisionDemand) - 1) * -1;
    }
    let cpuOverScore = 0;
    if (this.totalCpuOverprovisionDemand != 0) {
      cpuOverScore = (this.totalCpuSupply / this.totalCpuOverprovisionDemand) - 1;
    }
    let memUnderScore = 0;
    if (this.totalMemUnderprovisionDemand != 0) {
      memUnderScore = ((this.totalMemSupply / this.totalMemUnderprovisionDemand) - 1) * -1;
    }
    let memOverScore = 0;
    if (this.totalMemOverprovisionDemand != 0) {
      memOverScore = (this.totalMemSupply / this.totalMemOverprovisionDemand) - 1;
    }

    /* Grouped scores - average of both percentages. */
    let underScore = (cpuUnderScore + memUnderScore) / 2;
    let overScore = (cpuOverScore + memOverScore) / 2;

    /* Total score */
    let resourcesWaste = underScore + overScore;
    let score = 1 / resourcesWaste;
    return score;
  }
}

export default ScalingResult;
