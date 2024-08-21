import IR from "../../IR.js";

const NATURE: string = "commentAnnotation";

export default class CommentAnnotationIR extends IR {
  constructor(name: string) {
    super(name, NATURE);
  }
  public param: string | undefined;
  public explanation: string | undefined;
}
