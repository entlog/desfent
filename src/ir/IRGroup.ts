import IR from "./IR.js";


/**
 * Class used to group all irs obtained in a metadata operation 
 * @author Òscar Hernández Vinyals
 */
export default interface IRGroup {
  getIR<T extends IR>(name: string): T;
  getIRs<K extends IR>(): K[];
}