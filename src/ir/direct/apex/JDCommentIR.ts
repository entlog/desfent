import ApexIR from "./ApexIR.js";
import CommentAnnotation from "./CommentAnnotationIR.js";
import CommentIR from "./CommentIR.js";

const NATURE: string = 'JDComment';
export class JDCommentIR extends CommentIR {
   public annotations: CommentAnnotation[] = [];


   constructor() {
      super('JDCommentName', NATURE, true);
   }

   public addAnnotation(annotation: CommentAnnotation): void {
      this.annotations.push(annotation);
   }

   public toString(): string {
      return `Comment "${this.text}" with annotations [${this.annotations}]`;
   }

}