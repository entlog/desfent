import ApexIR from "./ApexIR.js";
import ApexTypeIR from "./ApexTypeIR.js";

const NATURE = "ApexParameter";

export default class ApexParameterIR extends ApexIR {
  public type: ApexTypeIR;

  constructor(name: string, type: ApexTypeIR) {
    super(name, NATURE);
    this.type = type;
  }

  public toString(): string {
    return `${this.type} -> ${this.name}`;
  }
}
