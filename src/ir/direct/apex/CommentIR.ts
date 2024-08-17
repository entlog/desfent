import IR from "../../IR.js";

const NATURE: string = 'Comment';
export default class CommentIR extends IR {
   public text: string | undefined;
   public multiline: boolean = false;


   constructor(name: string = 'Comment', nature: string = NATURE, multiline: boolean = false) {
      super(name, nature);
      this.multiline = multiline;
   }

}