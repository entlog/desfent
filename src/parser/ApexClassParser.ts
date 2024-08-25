/*
export DEBUG='sf:Parser'                       
export SF_LOG_LEVEL='info'     
*/ import ApexIR from "../ir/direct/apex/ApexIR.js";
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
import path from "path";

import { ParseContext, Parser } from "./Parser.js";
import ApexClassIR from "../ir/direct/apex/ApexClassIR.js";
import ParserError, { CODE_MALFORMED } from "../error/ParserError.js";
import { JDCommentIR } from "../ir/direct/apex/JDCommentIR.js";
import CommentIR from "../ir/direct/apex/CommentIR.js";
import { Token, TOKENTYPE_EOF } from "../lexer/Lexer.js";
import ApexTypeIR from "../ir/direct/apex/ApexTypeIR.js";
import JDCommentAnnotationIR from "../ir/direct/apex/JDCommentAnnotation.js";
import ApexAnnotationIR from "../ir/direct/apex/ApexAnnotationIR.js";
import {
   JD_ANNOTATIONS_WITHPARAMS,
   CLASS_ACCESSMODIFIERS,
   WORD_ABSTRACT,
   WORD_CLASS,
   WORD_EXTENDS,
   WORD_IMPLEMENTS,
   WORD_INTERFACE,
   WORD_VIRTUAL,
   WORD_WITH,
   WORD_WITHOUT,
   WORD_STATIC,
   WORD_TESTMETHOD,
   WORD_OVERRIDE,
   APX_ANNOTATION_ISTEST,
   WORD_FINAL,
   WORD_ENUM,
} from "../ir/direct/apex/ApexConstants.js";
import ApexMethodIR from "../ir/direct/apex/ApexMethodIR.js";
import { access } from "graceful-fs";
import ApexParameterIR from "../ir/direct/apex/ApexParameterIR.js";
import ApexStaticBlockIR from "../ir/direct/apex/ApexStaticBlockIR.js";
import ApexAttributeIR from "../ir/direct/apex/ApexAttributeIR.js";
import ApexEnumIR, { ApexEnumValueIR } from "../ir/direct/apex/ApexEnumIR.js";
import ApexBaseParser from "./ApexBaseParser.js";

export default class ApexClassParser extends ApexBaseParser<ApexIR> {
   private ret:ApexIR[] = [];
   // Used to calculate inner class names. Every time a new class is detected the name is pushed here
   private classStack:ApexClassIR[] = [];

   /**
    * Adds a new class name to the stack to create inner class names
    * @param name Name of the new class traversed
    */
   private pushClassToStack(cls:ApexClassIR):void {
      this.classStack.push(cls);
   }
   /**
    * Removes the class from the stack when we leave the class contents
    */
   private popClassToStack():void {
      this.classStack.pop();
   }
   /**
    * 
    * @returns The name of the parent classes joined by dots
    */
   private peekOuterClass():ApexClassIR|undefined {
      if (this.classStack.length == 0) {
         return undefined;
      }
      return this.classStack[this.classStack.length - 1];

   }

   

   

   /**
    * Method that interprets a type with or without generics
    * @returns
    */
   private doType(): ApexTypeIR {
      this.pushContext(ParseContext.TYPE);
      try {
         let token: ApexToken = this.lookAhead();
         this.log(`Doing type ${token}`);
         if (token.type != TOKENTYPE_CODE_WORD) {
            throw this.failedAttemptError;
         }
         let name:string = token.text;
         this.nextToken();
         token = this.lookAhead();

         while (token.type === TOKENTYPE_CODE_DOT) { // Type with inner class
            this.nextToken();
            name += '.';
            token = this.lookAhead();
            if (token.type !== TOKENTYPE_CODE_WORD) {
               throw new ParserError(
                  `Cannot interpret type after token ${token}`,
                  token.line,
                  token.offset
               );
            }
            name += token.text;
            this.nextToken();
            token = this.lookAhead();
         }
         let ret: ApexTypeIR = new ApexTypeIR(name);

         if (token.type === TOKENTYPE_CODE_LESS) {
            this.log(`Detected generics on type ${ret.name}`);
            this.nextToken();
            token = this.lookAhead();

            while (token.type != TOKENTYPE_CODE_GREATER) {
               if (token.type != TOKENTYPE_CODE_WORD) {
                  throw this.failedAttemptError;
               }
               ret.generics.push(this.doType());
               token = this.lookAhead();
               this.log(`After generic type ${token}`);
               if (token.type === TOKENTYPE_CODE_COMMA) {
                  this.nextToken();
                  token = this.lookAhead();
               } else if (token.type != TOKENTYPE_CODE_GREATER) {
                  throw this.failedAttemptError;
               }
            }
            this.log(`Last token after generics ${token}`);
            this.nextToken();
         }
         token = this.lookAhead();

         while (token.type === TOKENTYPE_CODE_SBRACKET_START) {
            // Array definition
            this.nextToken();
            token = this.lookAhead();
            if (token.type !== TOKENTYPE_CODE_SBRACKET_END) {
               this.log(
                  `Found the start square bracket but not the close one after ${token}`
               );
               throw this.failedAttemptError;
            }
            ret.arrayDimensions++;
            this.nextToken();
            token = this.lookAhead();
         }
         this.log(`Found type: ${ret}`);
         return ret;
      } finally {
         this.popContext();
      }
   }

   private doApexAnnotation(): ApexAnnotationIR {
      let token: Token = this.lookAhead();
      this.log(`Doing apex annotation ${token}`);
      if (token.type !== TOKENTYPE_CODE_ANNOTATION) {
         this.log(`Not annotation`);
         throw this.failedAttemptError;
      }
      let ret: ApexAnnotationIR = new ApexAnnotationIR(token.text);
      this.log(`Annotation with name: ${ret.name}`);
      this.nextToken();
      token = this.lookAhead();
      if (token.type === TOKENTYPE_CODE_RBRACKET_START) {
         // Has parameters
         this.nextToken();
         token = this.lookAhead();
         while (token.type !== TOKENTYPE_CODE_RBRACKET_END) {
            const name: string = token.text;
            this.nextToken();
            token = this.lookAhead();
            let value: string | undefined;
            if (token.type === TOKENTYPE_CODE_ASSIGN) {
               // Has value
               this.nextToken();
               token = this.lookAhead();
               value = token.text;
            }
            ret.addAnnotationParam(name, value);
            this.nextToken();
            token = this.lookAhead();
            if (token.type === TOKENTYPE_CODE_COMMA) {
               // More params
               this.nextToken();
               token = this.lookAhead();
            } else if (token.type !== TOKENTYPE_CODE_RBRACKET_END) {
               throw new ParserError(
                  `Unknown structure found in annotation. Expected comma "," or bracket close ")" but found ${token}`,
                  token.line,
                  token.offset
               );
            }
         }
         this.nextToken();
         this.ignoreComments();
      }
      return ret;
   }

   private doParameter(): ApexParameterIR {
      this.logger.info(`Doing parameter on ${this.lookAhead()}`);
      let ret: ApexParameterIR | undefined;
      this.pushContext(ParseContext.PARAM);
      let isFinal:boolean = false;
      try {
         let token: Token = this.lookAhead();
         if (token.type === TOKENTYPE_CODE_RESERVEDWORD && token.ltext == WORD_FINAL) {
            isFinal = true;
            this.nextToken();
            token = this.lookAhead();
         }
         let type: ApexTypeIR = this.doType();
         if (token.type !== TOKENTYPE_CODE_WORD) {
            this.log(
               `Problem reading parameter. Expected name of parameter but found ${token}`
            );
            throw this.failedAttemptError;
         }
         ret = new ApexParameterIR(token.text, type, isFinal);
         this.nextToken();
         this.log(`Read parameter: ${ret}`);
         return ret;
      } finally {
         this.popContext();
      }
   }

   private doMethodBody(method: ApexMethodIR): void {
      this.pushContext(ParseContext.METHODBODY);
      try {
         this.log(`Doing method body on ${this.lookAhead()}`);
         let nesting: number = 0;

         let comments: CommentIR[] = [];
         let jdComment: JDCommentIR | undefined;
         let token: ApexToken = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_CBRACKET_START) {
            this.log(
               `Expected method body to start with curly bracket "{" but found ${token}`
            );
            throw this.failedAttemptError;
         }
         this.nextToken();
         token = this.lookAhead();
         while (true) {
            if (token.type === TOKENTYPE_CODE_CBRACKET_END) {
               nesting--;
               this.log(`Method body nest depth decremented: ${nesting}`);
               this.nextToken();
               if (nesting < 0) {
                  // We start with nesting 0 and the end one is the closing one that was not counted in the nesting level
                  break;
               }
            } else if (token.type === TOKENTYPE_CODE_CBRACKET_START) {
               nesting++;
               this.log(`Method body nest depth incremented: ${nesting}`);
               this.nextToken();
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_ML_START && this.attempt("mlComment", this.doMLComment)) {
               comments.push(this.doMLComment());
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_JD_START && this.attempt("jdComment", this.doJDComment)) {
               jdComment = this.doJDComment();
               comments.push(jdComment);
            } else if (token.type === TOKENTYPE_EOF) {
               this.log(`Error: Reached end of file reading method body`);
               throw this.failedAttemptError;
            } else {
               this.nextToken();
            }
            if (method.maxNestDepth < nesting) {
               method.maxNestDepth = nesting;
            }
            token = this.lookAhead();
         }
         method.endLine = token.line;
         this.log(`Accepted method body: ${this.lookAhead()}`);
      } finally {
         this.popContext();
      }
   }

   private doMethod(isClass: boolean): ApexMethodIR {
      this.pushContext(ParseContext.METHOD);
      try {
         this.log(`Doing method ${this.lookAhead()}`);

         let guard: number = 0;
         let jdComment: JDCommentIR | undefined;
         let comments: CommentIR[] = [];
         while (true) {
            if (this.attempt("methodJDComment", this.doJDComment)) {
               jdComment = this.doJDComment();
            } else if (this.attempt("methodComment", this.doMLComment)) {
               comments.push(this.doMLComment());
            } else if (this.lookAhead().type == TOKENTYPE_COMMENT_SL) {
               this.nextToken();
            } else {
               break;
            }
            guard++;
            if (guard > 100) {
               this.log(`Guard triggered on method previous comments`);
               throw new Error("Guard triggered on method previous comments");
            }
         }
         guard = 0;
         let isTestMethod: boolean = false;
         const annotations: ApexAnnotationIR[] = [];
         while (this.attempt("methodAnnotation", this.doApexAnnotation)) {
            let ann: ApexAnnotationIR = this.doApexAnnotation();
            annotations.push(ann);
            if (ann.name.toLowerCase() === APX_ANNOTATION_ISTEST.toLowerCase()) {
               isTestMethod = true;
            }
            guard++;
            if (guard > 100) {
               this.log(`Guard triggered on method annotations`);
               throw new Error("Failed on method annotations");
            }
         }

         let ret: ApexMethodIR | undefined;
         let token: Token = this.lookAhead();
         let accessModifier: string = "package";
         if (CLASS_ACCESSMODIFIERS.has(token.ltext)) {
            accessModifier = token.text;
            this.log(`Found method access modifier ${accessModifier}`);
            this.nextToken();
            token = this.lookAhead();
         } else {
            this.log(`No access modifier in method ${token.line}`);
         }

         let isStatic: boolean = false;
         let isAbstract: boolean = false;
         let isVirtual: boolean = false;

         let isOverriding: boolean = false;
         let foundModifier: boolean = true;
         guard = 0;

         while (foundModifier) {
            switch (token.ltext) {
               case WORD_STATIC:
                  isStatic = true;
                  break;
               case WORD_ABSTRACT:
                  isAbstract = true;
                  break;
               case WORD_VIRTUAL:
                  isVirtual = true;
                  break;
               case WORD_TESTMETHOD:
                  isTestMethod = true;
                  break;
               case WORD_OVERRIDE:
                  isOverriding = true;
                  break;
               default:
                  foundModifier = false;
            }
            if (foundModifier) {
               this.nextToken();
               token = this.lookAhead();
            }
            guard++;
            if (guard > 100) {
               this.log(`Guard triggered on method modifiers`);
               throw new Error("Failed on method modifiers");
            }
         }
         this.log(`Calculating return type ${token}`);
         const returnType: ApexTypeIR = this.doType();
         token = this.lookAhead();

         if (token.type !== TOKENTYPE_CODE_WORD) {
            this.log(`Expected method name but found wrong type ${token}`);
            throw this.failedAttemptError;
         }

         const methodName: string = token.text;
         ret = new ApexMethodIR(methodName);
         ret.annotations = annotations;
         ret.returnType = returnType;
         ret.isStatic = isStatic;
         ret.isAbstract = isAbstract;
         ret.isTestMethod = isTestMethod;
         ret.accessModifier = accessModifier;
         ret.jdComment = jdComment;
         ret.comments = comments;
         ret.isVirtual = isVirtual;
         ret.isOverriding = isOverriding;

         this.nextToken();
         token = this.lookAhead();

         // Parameters
         if (token.type !== TOKENTYPE_CODE_RBRACKET_START) {
            this.log(
               `Expected open bracket for method parameters but found ${token}`
            );
            throw this.failedAttemptError;
         }

         this.nextToken();
         token = this.lookAhead();
         guard = 0;
         while (token.type !== TOKENTYPE_CODE_RBRACKET_END) {
            ret.parameters.push(this.doParameter());
            token = this.lookAhead();
            if (token.type === TOKENTYPE_CODE_COMMA) {
               this.nextToken();
            } else if (token.type !== TOKENTYPE_CODE_RBRACKET_END) {
               this.log(
                  `Expected closing bracket ")" or "," for method definition but found "${token}"`
               );
               // At this point this means fatal error interpreting it
               throw new ParserError(`Expected closing bracket ")" or "," for method definition but found "${token}"`,
                  token.line,
                  token.offset,
                  CODE_MALFORMED
               );
               // throw this.failedAttemptError;
            }
            guard++;
            if (guard > 100) {
               this.log(`Guard on parameters triggered`);
               throw new Error("Fatal iterations");
            }
         }
         this.nextToken();
         token = this.lookAhead();
         ret.startLine = token.line;

         if (isAbstract || !isClass) {
            if (token.type !== TOKENTYPE_CODE_SEMICOLON) {
               this.log(
                  `Expected semicolon ";" on ${isAbstract ? "abstract" : "interface"
                  } method but found ${token}`
               );
            }
            this.nextToken();
            token = this.lookAhead();
         } else {
            if (token.type !== TOKENTYPE_CODE_CBRACKET_START) {
               this.log(
                  `Expected curly bracket "{" as the method block start but found ${token}`
               );
               throw new ParserError(
                  `Expected curly bracket "{" as the method block start but found ${token}`,
                  token.line,
                  token.offset,
                  CODE_MALFORMED
               );
            }

            this.doMethodBody(ret);
         }

         return ret;
      } finally {
         this.popContext();
      }
   }

   private doConstructor(className: string): ApexMethodIR {
      this.pushContext(ParseContext.CONSTRUCTOR);
      try {
         let token: Token = this.lookAhead();
         this.log(`Doing constructor with token ${token}`);
         let jdComment: JDCommentIR | undefined;
         if (this.attempt("constructorJdComment", this.doJDComment)) {
            jdComment = this.doJDComment();
         }

         const annotations: ApexAnnotationIR[] = [];
         while (this.attempt("constructorAnnotation", this.doApexAnnotation)) {
            annotations.push(this.doApexAnnotation());
         }

         token = this.lookAhead();
         let accessModifier: string = "package";
         if (CLASS_ACCESSMODIFIERS.has(token.ltext)) {
            accessModifier = token.text;
            this.nextToken();
            token = this.lookAhead();
         }

         if (token.type !== TOKENTYPE_CODE_WORD) {
            this.log(
               `Expected identifier as the name of the constructor but found ${token}`
            );
            throw this.failedAttemptError;
         }
         if (token.ltext !== className.toLowerCase()) {
            this.log(
               `Expected constructor name to match ${className} but found ${token}`
            );
            throw this.failedAttemptError;
         }
         let constructor: ApexMethodIR = new ApexMethodIR(token.text);
         constructor.isConstructor = true;
         constructor.annotations = annotations;
         constructor.accessModifier = accessModifier;
         constructor.jdComment = jdComment;

         this.nextToken();
         token = this.lookAhead();

         if (token.type !== TOKENTYPE_CODE_RBRACKET_START) {
            this.log(
               `Expected open bracket "(" after constructor but found ${token}`
            );
            throw this.failedAttemptError;
         }
         this.nextToken();
         token = this.lookAhead();
         while (token.type !== TOKENTYPE_CODE_RBRACKET_END) {
            constructor.parameters.push(this.doParameter());
            token = this.lookAhead();
            if (token.type === TOKENTYPE_CODE_COMMA) {
               this.nextToken();
            } else if (token.type !== TOKENTYPE_CODE_RBRACKET_END) {
               this.log(
                  `Expected ")" or "," but found ${token} in constructor parameters`
               );
               throw this.failedAttemptError;
            }
         }
         this.nextToken();
         token = this.lookAhead();
         constructor.startLine = token.line;
         if (token.type !== TOKENTYPE_CODE_CBRACKET_START) {
            throw new ParserError(
               `Expected opening curly brace after constructor but found ${token}`,
               token.line,
               token.offset,
               CODE_MALFORMED
            );
         }
         this.log(`Starting constructor body from ${token}`);
         this.doMethodBody(constructor);
         token = this.lookAhead();
         this.log(`Detected constructor successfully`);
         return constructor;
      } finally {
         this.popContext();
      }
   }

   private doStaticBlock(): ApexStaticBlockIR {
      this.pushContext(ParseContext.STATICBLOCK);
      try {
         let jdComment: JDCommentIR | undefined;
         let comment: CommentIR | undefined;
         let commentFound: boolean = true;
         while (commentFound) {
            if (this.attempt("staticBlockJDComment", this.doJDComment)) {
               jdComment = this.doJDComment();
            } else if (this.attempt("staticBlockComment", this.doMLComment)) {
               comment = this.doMLComment();
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_SL) {
               this.nextToken();
            } else {
               commentFound = false;
            }
         }
         let token: Token = this.lookAhead();
         if (
            token.type !== TOKENTYPE_CODE_RESERVEDWORD ||
            token.ltext !== WORD_STATIC
         ) {
            throw this.failedAttemptError;
         }
         let startLine: number = token.line;
         this.nextToken();
         token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_CBRACKET_START) {
            throw this.failedAttemptError;
         }
         this.nextToken();
         token = this.lookAhead();

         const ret: ApexStaticBlockIR = new ApexStaticBlockIR();
         let nesting: number = 0;
         let maxNesting: number = 0;
         while (token.type !== TOKENTYPE_EOF) {
            if (this.lookAhead().type === TOKENTYPE_COMMENT_JD_START && this.attempt("jdcomment", this.doJDComment)) {
               this.doJDComment();
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_ML_START && this.attempt("mlcomment", this.doMLComment)) {
               this.doMLComment();
            } else if (this.lookAhead().type === TOKENTYPE_CODE_CBRACKET_END) {
               nesting--;
               if (nesting < 0) {
                  break;
               }
               this.nextToken();
               token = this.lookAhead();
            } else if (this.lookAhead().type === TOKENTYPE_CODE_CBRACKET_START) {
               nesting++;
               if (maxNesting < nesting) {
                  maxNesting = nesting;
               }
               this.nextToken();
               token = this.lookAhead();
            } else {
               this.nextToken();
               token = this.lookAhead();
            }
         }

         ret.endLine = token.line;
         ret.maxNestingDepth = maxNesting;
         ret.startLine = startLine;
         this.nextToken();
         return ret;
      } finally {
         this.popContext();
      }
   }

   /**
    * Method that ignores all tokens until it finds the matching end token "}"
    */
   private ignoreBlock(): void {
      let token: Token = this.lookAhead();
      let startToken: Token = token;
      if (token.type !== TOKENTYPE_CODE_CBRACKET_START) {
         throw new ParserError(
            `Cannot ignore block that does not start with "{" -> ${token}`,
            token.line,
            token.offset,
            CODE_MALFORMED
         );
      }
      let nesting: number = 0;
      do {
         this.nextToken();
         token = this.lookAhead();
         if (token.type === TOKENTYPE_CODE_CBRACKET_START) {
            nesting++;
         } else if (token.type === TOKENTYPE_CODE_CBRACKET_END) {
            nesting--;
            if (nesting < 0) {
               break;
            }
         } else if (token.type === TOKENTYPE_EOF) {
            throw new ParserError(
               `Unable to ignore block that started on ${startToken}. Reached EOF`,
               startToken.line,
               startToken.offset,
               CODE_MALFORMED
            );
         }
      } while (true);
      this.nextToken();
   }

   /**
    * Helper methods to ignore out of place comments
    */
   private ignoreComments(): void {
      while (true) {
         let token: ApexToken = this.lookAhead();
         if (
            token.type == TOKENTYPE_COMMENT_ML_START ||
            token.type == TOKENTYPE_COMMENT_JD_START
         ) {
            do {
               this.nextToken();
               token = this.lookAhead();
            } while (token.type !== TOKENTYPE_COMMENT_ML_END);
            this.nextToken();
            token = this.lookAhead();
         } else if (token.type === TOKENTYPE_COMMENT_SL) {
            this.nextToken();
            token = this.lookAhead();
         } else {
            break;
         }
      }
   }

   private doEnum(): ApexEnumIR {
      this.pushContext(ParseContext.ENUM);
      try {
         let goOn: boolean = true;
         let jdComment: JDCommentIR | undefined;
         let comments: CommentIR[] = [];
         while (goOn) {
            if (this.lookAhead().type === TOKENTYPE_COMMENT_JD_START && this.attempt("jdComment", this.doJDComment)) {
               jdComment = this.doJDComment();
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_ML_START && this.attempt("comment", this.doMLComment)) {
               comments.push(this.doMLComment());
            } else {
               goOn = false;
            }
         }

         let token: Token = this.lookAhead();
         let accessModifier: string = "package";
         if (CLASS_ACCESSMODIFIERS.has(token.ltext)) {
            accessModifier = token.text;
            this.nextToken();
            token = this.lookAhead();
         }
         this.log(`Access modifier is: ${accessModifier}`);

         if (WORD_ENUM !== token.ltext) {
            this.log(`Desisted enum on token: ${token}`);
            throw this.failedAttemptError;
         }

         this.nextToken();
         token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_WORD) {
            this.log(`Found irrecoverable error for enum on token: ${token}`);
            throw new ParserError(
               `Expected identifier after reserved word enum but found ${token}`,
               token.line,
               token.offset,
               CODE_MALFORMED
            );
         }
         let ret: ApexEnumIR = new ApexEnumIR(token.text);
         ret.jdComment = jdComment;
         ret.comments = comments;
         ret.accessModifier = accessModifier;
         this.nextToken();
         token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_CBRACKET_START) {
            throw new ParserError(
               `Expected curly bracket after enum name "{" but found ${token}`,
               token.line,
               token.offset,
               CODE_MALFORMED
            );
         }
         this.nextToken();
         token = this.lookAhead();
         let valueJDComment: JDCommentIR | undefined;
         let valueComments: CommentIR[] = [];
         while (token.type !== TOKENTYPE_CODE_CBRACKET_END) {
            valueJDComment = undefined;
            valueComments = [];
            while (true) {
               if (this.attempt("enumValueJDComment", this.doJDComment)) {
                  valueJDComment = this.doJDComment();
                  this.log(`Added jd comment to enum`);
               } else if (this.attempt("enumValueMLComment", this.doMLComment)) {
                  valueComments.push(this.doMLComment());
                  this.log(`Added ml comment to enum`);
               } else if (token.type === TOKENTYPE_COMMENT_SL) {
                  let valueSLComment: CommentIR = new CommentIR();
                  valueSLComment.text = token.text;
                  valueComments.push(valueSLComment);
                  this.log(`Added sl comment to enum`);
               } else {
                  this.log(`Desisted on finding enum comments`);
                  break;
               }
            }
            token = this.lookAhead();
            this.log(`Retrieving enum value after comments ${token}`);
            if (token.type === TOKENTYPE_CODE_WORD) {
               const enumValue: ApexEnumValueIR = new ApexEnumValueIR(token.text);
               // Only store one of them
               enumValue.jdComment = valueJDComment;
               enumValue.comments = valueComments;

               ret.values.push(enumValue);
               this.nextToken();
               token = this.lookAhead();
            } else {
               throw new ParserError(
                  `No identifier found for enum at token ${token}`,
                  token.line,
                  token.offset,
                  CODE_MALFORMED
               );
            }
            this.ignoreComments();
            token = this.lookAhead();
            if (token.type === TOKENTYPE_CODE_COMMA) {
               this.nextToken();
               token = this.lookAhead();
            } else if (token.type !== TOKENTYPE_CODE_CBRACKET_END) {
               throw new ParserError(
                  `Expected a comma "," or closing curly bracket "}" after enum value but found ${token}`,
                  token.line,
                  token.offset,
                  CODE_MALFORMED
               );
            }
         }
         this.nextToken();
         return ret;
      } finally {
         this.popContext();
      }
   }

   private doAttribute(): ApexAttributeIR {
      this.pushContext(ParseContext.ATTRIBUTE);
      try {
         let jdComment: JDCommentIR | undefined;
         let comment: CommentIR | undefined;
         let commentFound: boolean = true;
         while (commentFound) {
            if (this.attempt("staticBlockJDComment", this.doJDComment)) {
               jdComment = this.doJDComment();
            } else if (this.attempt("staticBlockComment", this.doMLComment)) {
               comment = this.doMLComment();
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_SL) {
               this.nextToken();
            } else {
               commentFound = false;
            }
         }
         const annotations: ApexAnnotationIR[] = [];
         while (this.attempt("attributeAnnotation", this.doApexAnnotation)) {
            annotations.push(this.doApexAnnotation());
         }
         let token: Token = this.lookAhead();
         let accessModifier: string = "package";
         if (CLASS_ACCESSMODIFIERS.has(token.ltext)) {
            accessModifier = token.text;
            this.nextToken();
            token = this.lookAhead();
         }
         let isStatic: boolean = false;
         let isFinal: boolean = false;
         let foundModifier: boolean = true;
         while (foundModifier) {
            switch (token.ltext) {
               case WORD_STATIC:
                  isStatic = true;
                  break;
               case WORD_FINAL:
                  isFinal = true;
                  break;
               default:
                  foundModifier = false;
            }
            if (foundModifier) {
               this.nextToken();
               token = this.lookAhead();
            }
         }

         const type: ApexTypeIR = this.doType();
         token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_WORD) {
            this.log(
               `Expected attribute identifier to be of type word but found ${token}`
            );
            throw this.failedAttemptError;
         }

         let ret: ApexAttributeIR = new ApexAttributeIR(token.text);
         ret.annotations = annotations;
         ret.line = token.line;
         ret.type = type;
         ret.jdComment = jdComment;
         ret.isStatic = isStatic;
         ret.isFinal = isFinal;
         ret.accessModifier = accessModifier;
         this.nextToken();
         token = this.lookAhead();

         if (token.type === TOKENTYPE_CODE_CBRACKET_START) {
            this.log(`Detected attribute getter and setters`);
            this.ignoreBlock();
            token = this.lookAhead();
            // After initialization a block can exist
            if (token.type === TOKENTYPE_CODE_CBRACKET_START) {
               this.ignoreBlock();
            }
         } else {
            // Normal attribute without setters
            while (token.type !== TOKENTYPE_CODE_SEMICOLON) {
               this.nextToken();
               token = this.lookAhead();
            }
         }
         if (token.type == TOKENTYPE_CODE_SEMICOLON) {
            this.nextToken();
         }
         this.log(`Accepted attribute`);
         return ret;
      } finally {
         this.popContext();
      }
   }

   private doClassBody(classIR: ApexClassIR): void {
      this.pushContext(ParseContext.CLASSBODY);
      try {
         let token: Token = this.lookAhead();
         if (token.type !== TOKENTYPE_CODE_CBRACKET_START) {
            throw new ParserError(
               `Expected char "{" after class declaration but found ${token}`,
               token.line,
               token.offset,
               CODE_MALFORMED
            );
         }

         this.nextToken();
         token = this.lookAhead();
         while (
            token.type !== TOKENTYPE_CODE_CBRACKET_END &&
            token.type !== TOKENTYPE_EOF
         ) {
            this.log(`Doing class body on token ${token}`);

            if (this.attempt("method", () => this.doMethod(classIR.isClass))) {
               classIR.methods.push(this.doMethod(classIR.isClass));
            } else if (this.attempt("innerClass", this.doClass)) {
               const innerClass: ApexClassIR = this.doClass();
               
               this.log(`Inner class ${innerClass}`);
               classIR.innerClasses.push(innerClass);
               if (!this.isAttempting()) {
                  this.ret.push(innerClass);
               }
            } else if (
               this.attempt("constructor", () => this.doConstructor(classIR.name))
            ) {
               classIR.constructorMethod = this.doConstructor(classIR.name);
               classIR.methods.push(classIR.constructorMethod);
            } else if (this.attempt("staticblock", this.doStaticBlock)) {
               classIR.staticBlocks.push(this.doStaticBlock());
            } else if (this.attempt("attribute", this.doAttribute)) {
               classIR.attributes.push(this.doAttribute());
            } else if (this.attempt("enum", this.doEnum)) {
               classIR.enums.push(this.doEnum());
            } else if (this.attempt("comment", this.doMLComment)) {
               this.doMLComment(); // Ignored
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_JD_START && this.attempt("jdComment", this.doJDComment)) {
               this.doJDComment(); // Ignored (and not really normal)
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_JD_START && this.lookAhead().type === TOKENTYPE_COMMENT_SL) {
               this.nextToken(); // Ignore lost inline comments
            } else {
               throw new ParserError(
                  `Unable to understand structure in class body after token ${token}`,
                  token.line,
                  token.offset,
                  CODE_MALFORMED
               );
            }

            token = this.lookAhead();
         }

         if (token.type !== TOKENTYPE_CODE_CBRACKET_END) {
            throw new ParserError(
               `No leading "}" found`,
               token.line,
               token.offset,
               CODE_MALFORMED
            );
         }
         this.nextToken(); // Ignore ending bracket "}"

         classIR.endLine = token.line;
      } finally {
         this.popContext();
      }
   }

   private doClass(): ApexClassIR {
      this.pushContext(ParseContext.CLASS);
      try {
         this.log(`Doing class: ${this.lookAhead()}`);
         let token: ApexToken = this.lookAhead();
         let jdComment: JDCommentIR | undefined;
         let comments: CommentIR[] = [];
         let preClassItems: boolean = true;

         const annotations: ApexAnnotationIR[] = [];

         while (preClassItems) {
            if (this.lookAhead().type === TOKENTYPE_COMMENT_JD_START && this.attempt("jdComment", this.doJDComment)) {
               jdComment = this.doJDComment(); // Always keep latest javadoc comment
               comments.push(jdComment);
            } else if (this.lookAhead().type === TOKENTYPE_COMMENT_ML_START && this.attempt("mlComment", this.doMLComment)) {
               comments.push(this.doMLComment());
            } else if (token.type === TOKENTYPE_COMMENT_SL) {
               const comment: CommentIR = new CommentIR();
               comment.text = token.text;
               comments.push(comment);
               this.nextToken();
            } else if (this.attempt("apexAnnotation", this.doApexAnnotation)) {
               annotations.push(this.doApexAnnotation());
            } else {
               preClassItems = false;
            }
            token = this.lookAhead();
         }

         token = this.lookAhead();
         this.log(`Starting class recognition from token ${token}`);
         let accessModifier: string = "package";
         if (CLASS_ACCESSMODIFIERS.has(token.text.toLowerCase())) {
            accessModifier = token.text;
            this.log(`Access modifier is ${token}`);
            this.nextToken();
            token = this.lookAhead();
         } else {
            this.log(`No access modifier found. Next token: ${token} `);
         }

         let isWithSharing: boolean = false;
         let isAbstract: boolean = false;
         let isVirtual: boolean = false;
         let isClass: boolean = false;

         let detectedModifier: boolean = true;
         while (detectedModifier) {
            if (
               token.text.toLowerCase() === WORD_WITH ||
               token.text.toLowerCase() === WORD_WITHOUT
            ) {
               isWithSharing = token.text.toLowerCase() === WORD_WITH;
               this.nextToken(); // Skip this one and the sharing word
               this.nextToken();
            } else if (token.text.toLowerCase() === WORD_ABSTRACT) {
               isAbstract = true;
               this.nextToken();
            } else if (token.text === WORD_VIRTUAL) {
               (isVirtual = true), this.nextToken();
            } else {
               detectedModifier = false;
            }
            token = this.lookAhead();
            this.log(`Class modifier check against ${token}`);
         }

         if (token.text.toLowerCase() === WORD_CLASS) {
            isClass = true;
         } else if (token.text.toLowerCase() === WORD_INTERFACE) {
            isClass = false;
         } else {
            this.log(
               `No class nor interface detected on token ${token}. Desisting...`
            );
            throw this.failedAttemptError;
         }
         const startLine: number = token.line;

         this.nextToken();
         let nameToken: ApexToken = this.lookAhead();
         this.nextToken();
         token = this.lookAhead();

         // Get base classes
         let baseClass: ApexTypeIR | undefined;
         if (token.text.toLowerCase() === WORD_EXTENDS) {
            this.nextToken();
            baseClass = this.doType();
            token = this.lookAhead();
         }

         this.log(`Next token after extends block ${token}`);

         const interfaces: ApexTypeIR[] = [];
         if (token.text.toLowerCase() === WORD_IMPLEMENTS) {
            this.nextToken();
            token = this.lookAhead();
            let moreInterfaces: boolean = false;
            do {
               interfaces.push(this.doType());
               token = this.lookAhead();
               if (token.type === TOKENTYPE_CODE_COMMA) {
                  moreInterfaces = true;
                  this.nextToken();
                  token = this.lookAhead();
               } else {
                  moreInterfaces = false;
               }
            } while (moreInterfaces);
         }
         this.log(`After implements block next token is ${token}`);

         let classIR: ApexClassIR = new ApexClassIR(nameToken.text);
         classIR.outerClass = this.peekOuterClass();
         this.pushClassToStack(classIR);
         try {
            classIR.accessModifier = accessModifier;
            classIR.isWithSharing = isWithSharing;
            classIR.jdComment = jdComment;
            classIR.isClass = isClass;
            classIR.isAbstract = isAbstract;
            classIR.isVirtual = isVirtual;
            classIR.interfaces = interfaces;
            classIR.baseClass = baseClass;
            classIR.annotations = annotations;
            classIR.startLine = startLine;

            this.doClassBody(classIR);
         } finally {
            this.popClassToStack();
         }
         this.log(`Accepted class`);
         return classIR;
      } finally {
         this.popContext();
      }
   }

   public parse(): ApexIR[] {
      this.logger.info(`Starting parse of resource ${this.lexer.getResourceName()}`);
      let ir: ApexIR | undefined;
      try {
         if (this.attempt("class", this.doClass)) {
            this.ret.push(this.doClass());
         } else if (this.attempt("enum", this.doEnum)) {
            this.ret.push(this.doEnum());
         } else {
            throw new ParserError(
               `Unable to identify structure ${this.lookAhead()}`,
               this.lookAhead().line,
               this.lookAhead().offset,
               CODE_MALFORMED,
               this.createSnapshot()
            );
         }
      } catch (e) {
         this.logger.error(`Problems interpreting code ${e}`);
         this.lexer.dismiss();
         const resourceName: string = path.basename(this.getResourceName());
         ir = new ApexClassIR(resourceName);
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
         this.ret.push(ir);
      }
      return this.ret;
   }
}
