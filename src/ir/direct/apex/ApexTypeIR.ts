import Utils from "../../../Utils.js";
import ApexIR from "./ApexIR.js";

const NATURE: string = "ApexType";
/**
 * Class containing one information about one class defined in the metadata. This include the name
 * of new classes defined in resource or referenced
 * Each class contains also generics for the definition
 */
export default class ApexTypeIR extends ApexIR {
  // Used if we are defining an array of the type. This contains the number of dimensions of the array
  public arrayDimensions: number = 0;
  public generics: ApexTypeIR[] = [];

  constructor(name: string) {
    super(name, NATURE);
  }

  public toString(): string {
    let arrayDim: string = "";
    for (let i = 0; i < this.arrayDimensions; i++) {
      arrayDim += "[]";
    }
    return (
      this.name +
      (this.generics.length > 0
        ? Utils.prettyPrint(this.generics, "<", ">")
        : "") +
      arrayDim
    );
  }
}
