import IR from "./IR.js";

/**
 * Class used to group all irs obtained in a metadata operation and offer utility operations
 * @author Òscar Hernández Vinyals
 */
export default class IRGroup {
  private trees: Map<string, IR> = new Map<string, IR>();

  public addTree(name: string, root: IR): void {
    this.trees.set(name, root);
  }
  public getTree(name: string): IR | undefined {
    return this.trees.get(name);
  }
  public getTrees(): Iterable<IR> {
    return this.trees.values();
  }
}
