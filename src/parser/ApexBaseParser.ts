import { JD_ANNOTATIONS_WITHPARAMS } from "../ir/direct/apex/ApexConstants.js";
import ApexIR from "../ir/direct/apex/ApexIR.js";
import CommentIR from "../ir/direct/apex/CommentIR.js";
import JDCommentAnnotationIR from "../ir/direct/apex/JDCommentAnnotation.js";
import { JDCommentIR } from "../ir/direct/apex/JDCommentIR.js";
import { ApexToken, TOKENTYPE_COMMENT_JD_ANNOTATION, TOKENTYPE_COMMENT_JD_START, TOKENTYPE_COMMENT_ML_END, TOKENTYPE_COMMENT_ML_START, TOKENTYPE_COMMENT_WORD } from "../lexer/ApexLexer.js";
import { TOKENTYPE_EOF } from "../lexer/Lexer.js";
import { ParseContext, Parser } from "./Parser.js";

export default abstract class ApexBaseParser<T extends ApexIR> extends Parser<ApexToken, T> {
   protected doJDCommentAnnotation(): JDCommentAnnotationIR {
      this.pushContext(ParseContext.ANNOTATION);
      try {
         let token: ApexToken = this.lookAhead();

         if (token.type !== TOKENTYPE_COMMENT_JD_ANNOTATION) {
            throw this.failedAttemptError;
         }
         this.log(`Creating jd comment annotation with token ${token}`);
         let ret: JDCommentAnnotationIR = new JDCommentAnnotationIR(token.text);

         this.nextToken();
         token = this.lookAhead();
         if (
            JD_ANNOTATIONS_WITHPARAMS.has(ret.name) &&
            token.type === TOKENTYPE_COMMENT_WORD
         ) {
            this.log(`Found annotation with param ${ret}`);
            ret.param = token.text;
            this.nextToken();
            token = this.lookAhead();
         }
         ret.explanation = "";

         const line: number = token.line;
         this.log(`Reading remaining annotation on line ${line}`);
         while (
            (token = this.lookAhead()).line === line &&
            token.type !== TOKENTYPE_EOF &&
            token.type !== TOKENTYPE_COMMENT_ML_END
         ) {
            ret.explanation += ` ${token.text}`;
            this.nextToken();
         }
         this.log(
            `Created jd comment annotation ${ret} - Next token ${this.lookAhead()}`
         );
         return ret;
      } finally {
         this.popContext();
      }
   }

   /**
       * Method that interprets a javadoc comment
       * @returns
       */
   protected doJDComment(): JDCommentIR {
      this.pushContext(ParseContext.JDCOMMENT);
      try {
         this.log(`Doing jd comment on ${this.lookAhead()}...`);
         let token: ApexToken = this.lookAhead();
         if (token.type != TOKENTYPE_COMMENT_JD_START) {
            this.log(`Desisting jdcomment...no comment start ${token}`);
            throw this.failedAttemptError;
         }
         this.log(`Detected jdcomment start...`);
         this.nextToken();
         let ret: JDCommentIR = new JDCommentIR();
         let text: string = "";
         let line: number = -1;
         do {
            token = this.lookAhead();
            if (token.type == TOKENTYPE_COMMENT_ML_END) {
               this.nextToken(); // Consume
               break;
            } else if (token.type === TOKENTYPE_COMMENT_JD_ANNOTATION) {
               ret.addAnnotation(this.doJDCommentAnnotation());
            } else {
               if (line == token.line || token.text.trim() !== '*') {
                  text += ` ${token.text}`;
               }
               this.nextToken(); // Consume
            }
         } while (token != null && token.type != TOKENTYPE_EOF);
         ret.text = text.trim();
         this.log(`Accepted jdcomment. Next token ${this.lookAhead()}`);
         return ret;
      } finally {
         this.popContext();
      }
   }

   protected doMLComment(): CommentIR {
      this.log(`Doing ml comment on ${this.lookAhead()}...`);
      this.pushContext(ParseContext.COMMENT);
      try {
         let token: ApexToken = this.lookAhead();
         if (token.type != TOKENTYPE_COMMENT_ML_START) {
            this.log(`Desisting mlcomment...no comment start ${token}`);
            throw this.failedAttemptError;
         }
         this.log(`Detected mlcomment start...`);
         this.nextToken();
         let ret: CommentIR = new CommentIR();
         ret.multiline = true;
         ret.text = "";
         do {
            token = this.lookAhead();
            if (token.type == TOKENTYPE_COMMENT_ML_END) {
               this.nextToken(); // Consume
               break;
            } else {
               ret.text += ` ${this.nextToken().text}`;
            }
         } while (token != null && token.type != TOKENTYPE_EOF);
         ret.text = ret.text.trim();
         this.log(`Accepted mlcomment`);
         return ret;
      } finally {
         this.popContext();
      }
   }
}