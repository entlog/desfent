import ApexIR from "../ir/direct/apex/ApexIR.js";
import { ParseContext, Parser } from "./Parser.js";

import path from "path";
import {
   ApexToken,
   TOKENTYPE_CODE_ANNOTATION,
   TOKENTYPE_CODE_ASSIGN,
   TOKENTYPE_CODE_CBRACKET_END,
   TOKENTYPE_CODE_CBRACKET_START,
   TOKENTYPE_CODE_COMMA,
   TOKENTYPE_CODE_DOT,
   TOKENTYPE_CODE_GREATER,
   TOKENTYPE_CODE_LESS,
   TOKENTYPE_CODE_RBRACKET_END,
   TOKENTYPE_CODE_RBRACKET_START,
   TOKENTYPE_CODE_RESERVEDWORD,
   TOKENTYPE_CODE_SBRACKET_END,
   TOKENTYPE_CODE_SBRACKET_START,
   TOKENTYPE_CODE_SEMICOLON,
   TOKENTYPE_CODE_WORD,
   TOKENTYPE_COMMENT_JD_ANNOTATION,
   TOKENTYPE_COMMENT_JD_START,
   TOKENTYPE_COMMENT_ML_END,
   TOKENTYPE_COMMENT_ML_START,
   TOKENTYPE_COMMENT_SL,
   TOKENTYPE_COMMENT_WORD,
} from "../lexer/ApexLexer.js";
import ApexTriggerIR from "../ir/direct/apex/ApexTriggerIR.js";
import ParserError, { CODE_MALFORMED } from "../error/ParserError.js";
import ApexBaseParser from "./ApexBaseParser.js";
import { JDCommentIR } from "../ir/direct/apex/JDCommentIR.js";
import CommentIR from "../ir/direct/apex/CommentIR.js";
import { WORD_AFTER, WORD_BEFORE, WORD_DELETE, WORD_INSERT, WORD_ON, WORD_TRIGGER, WORD_UNDELETE, WORD_UPDATE } from "../ir/direct/apex/ApexConstants.js";
import { TOKENTYPE_EOF } from "../lexer/Lexer.js";

export default class ApexTriggerParser extends ApexBaseParser<ApexTriggerIR> {

   public doInterpretTriggerParams(ir:ApexTriggerIR):void {
      let token:ApexToken = this.lookAhead();
      if (token.type !== TOKENTYPE_CODE_RBRACKET_START) {
         throw new ParserError(`Unable to identify structure on trigger. Expected parenthesis "(" but found ${token}:: ${this.createSnapshot()}`, token.line, token.offset, CODE_MALFORMED);
      }
      this.nextToken();
      token = this.lookAhead();
      while (token.type !== TOKENTYPE_CODE_RBRACKET_END) {
         if (token.type !== TOKENTYPE_CODE_RESERVEDWORD
            || (token.ltext !== WORD_BEFORE && token.ltext !== WORD_AFTER)) {

            throw new ParserError(`Unable to identify structure on trigger. Expected reserved word "before" or "after" but found ${token}:: ${this.createSnapshot()}`, token.line, token.offset, CODE_MALFORMED);
         }
         let isBefore:boolean = token.ltext === WORD_BEFORE;

         this.nextToken();
         token = this.lookAhead();

         if (token.type !== TOKENTYPE_CODE_RESERVEDWORD) {
            throw new ParserError(`Unable to identify structure on trigger. Expected reserved word "udate", "insert", "delete" or "undelete" but found ${token}:: ${this.createSnapshot()}`, token.line, token.offset, CODE_MALFORMED);
         }
         switch (token.ltext) {
            case WORD_INSERT:
               isBefore?ir.beforeInsert = true:ir.afterInsert = true;
               break;
            case WORD_UPDATE:
               isBefore?ir.beforeUpdate = true:ir.afterUpdate = true;
               break;
            case WORD_DELETE:
               isBefore?ir.beforeDelete = true:ir.afterDelete = true;
               break;
            case WORD_UNDELETE:
               isBefore?ir.beforeUndelete = true:ir.afterUndelete = true;
               break;
            default:
               throw new ParserError(`Unable to identify structure on trigger. Expected reserved word "udate", "insert", "delete" or "undelete" but found ${token}:: ${this.createSnapshot()}`, token.line, token.offset, CODE_MALFORMED); 
         }

         this.nextToken();
         token = this.lookAhead();
         if (token.type === TOKENTYPE_CODE_COMMA) {
            this.nextToken();
            token = this.lookAhead();
         } else if (token.type !== TOKENTYPE_CODE_RBRACKET_END) {
            throw new ParserError(`Unable to identify structure on trigger. Expected comma or closing parenthesis but found ${token}:: ${this.createSnapshot()}`, token.line, token.offset, CODE_MALFORMED); 
         }
      }


   }

   private doTriggerBody(ir: ApexTriggerIR): void {
      this.pushContext(ParseContext.TRIGGERBODY);
      try {
         this.log(`Doing trigger body on ${this.lookAhead()}`);
         let nesting: number = 0;

         let comments: CommentIR[] = [];
         let jdComment: JDCommentIR | undefined;
         let token: ApexToken = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_CBRACKET_START) {
            this.log(
               `Expected trigger body to start with curly bracket "{" but found ${token}`
            );
            throw this.failedAttemptError;
         }
         this.nextToken();
         token = this.lookAhead();
         while (true) {
            if (token.type === TOKENTYPE_CODE_CBRACKET_END) {
               nesting--;
               this.log(`Trigger body nest depth decremented: ${nesting}`);
               this.nextToken();
               if (nesting < 0) {
                  // We start with nesting 0 and the end one is the closing one that was not counted in the nesting level
                  break;
               }
            } else if (token.type === TOKENTYPE_CODE_CBRACKET_START) {
               nesting++;
               this.log(`Trigger body nest depth incremented: ${nesting}`);
               this.nextToken();
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_ML_START && this.attempt("mlComment", this.doMLComment)) {
               comments.push(this.doMLComment());
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_JD_START && this.attempt("jdComment", this.doJDComment)) {
               jdComment = this.doJDComment();
               comments.push(jdComment);
            } else if (token.type === TOKENTYPE_EOF) {
               this.log(`Error: Reached end of file reading trigger body`);
               throw this.failedAttemptError;
            } else {
               this.nextToken();
            }
            if (ir.maxNestDepth < nesting) {
               ir.maxNestDepth = nesting;
            }
            token = this.lookAhead();
         }
         ir.endLine = token.line;
         this.log(`Accepted trigger body: ${this.lookAhead()}`);
      } finally {
         this.popContext();
      }
   }

   public parse(): ApexTriggerIR[] {
      let ret: ApexTriggerIR[] = [];
      let ir: ApexTriggerIR|undefined;
      this.pushContext(ParseContext.TRIGGER);
      try {
         let token:ApexToken = this.lookAhead();
         let jdComm:JDCommentIR|undefined;
         let mlComms:CommentIR[] = [];
         while (true) {
            if (token.type === TOKENTYPE_COMMENT_JD_START && this.attempt('jdComment', this.doJDComment)) {
               jdComm = this.doJDComment();
            } else if (token.type === TOKENTYPE_COMMENT_ML_START && this.attempt('jdComment', this.doMLComment)) {
               mlComms.push(this.doMLComment());
            } else if (token.type === TOKENTYPE_COMMENT_SL) {
               this.nextToken();
            } else {
               break;
            }
         }
         token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_RESERVEDWORD || token.ltext !== WORD_TRIGGER) {
            throw new ParserError(`Unable to identify structure on trigger. Expected word trigger but found ${token}:: ${this.createSnapshot()}`,
            token.line, token.offset, CODE_MALFORMED);
         }
         this.nextToken();
         token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_WORD) {
            throw new ParserError(`Unable to identify structure on trigger. Expected name of trigger but found ${token}:: ${this.createSnapshot()}`,
            token.line, token.offset, CODE_MALFORMED);
         }
         ir = new ApexTriggerIR(token.text);
         ir.startLine = token.line;
         ir.jdComment = jdComm;
         ir.comments = mlComms;
         ret.push(ir);

         this.nextToken();
         token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_RESERVEDWORD || token.ltext !== WORD_ON) {
            throw new ParserError(`Unable to identify structure on trigger. Expected word "on" but found ${token}:: ${this.createSnapshot()}`,
            token.line, token.offset, CODE_MALFORMED);            
         }
         this.nextToken();
         token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_WORD) {
            throw new ParserError(`Unable to identify structure on trigger. Expected object name but found ${token}:: ${this.createSnapshot()}`, token.line, token.offset, CODE_MALFORMED);
         }
         ir.onObject = token.text;

         this.nextToken();
         this.doInterpretTriggerParams(ir);

         this.nextToken();
         token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_CBRACKET_START) {
            throw new ParserError(`Unable to identify structure on trigger. Expected curly bracket "{" but found ${token}:: ${this.createSnapshot()}`, token.line, token.offset, CODE_MALFORMED); 
         }
   

         this.doTriggerBody(ir);
      } catch (e) {
         this.logger.error(`Problems interpreting code ${e}`);
         this.lexer.dismiss();
         const resourceName: string = path.basename(this.getResourceName());
         ir = new ApexTriggerIR(resourceName);
         let line: number = 0;
         let offset: number = 0;
         let message: string = `${e}`;
         let snapshot: string | undefined;
         if (e instanceof Error) {
            if (e instanceof ParserError) {
               line = e.line;
               offset = e.offset;
               snapshot = e.snapshot;
            }
            message = e.message;
         }
         ir.addParsingProblem(message, line, offset, snapshot);
         ret.push(ir);
      } finally {
         this.popContext();
      }
      return ret;
   }

}