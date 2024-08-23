import IR from "./IR.js";

/**
 * Class used to group all irs obtained in a metadata operation and offer utility operations
 * @author Òscar Hernández Vinyals
 */
export default class IRGroup {
  private _name2trees: Map<string, IR> = new Map<string, IR>();

  private _name2filename: Map<string, string> = new Map<string, string>();

  public addTree(name: string, root: IR, filename: string): void {
    this._name2trees.set(name, root);
    this._name2filename.set(name, filename);
  }
  public getTree(name: string): IR | undefined {
    return this._name2trees.get(name);
  }
  public get trees(): Iterable<IR> {
    return this._name2trees.values();
  }

  public getFilenameForIR(tree: IR):string|undefined {

   return this._name2filename.get(tree.name);
  } 
}
