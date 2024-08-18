import { Logger } from "@salesforce/core";
import Lexer, { Token } from "../lexer/Lexer.js"
import Stream from "../lexer/Stream.js";
import Utils from "../Utils.js";
import IR from "../ir/IR.js";

/**
 * List of contexts in parsing. They allow to specify where we want messages to show up
 * when debugging logs
 */
export enum ParseContext {
   ENUM = 'ENUM', CLASS = 'CLASS', CLASSBODY = 'CLASSBODY', COMMENT = 'COMMENT',
   JDCOMMENT = 'JDCOMMENT', METHOD = 'METHOD', METHODBODY = 'METHODBODY',
   TYPE = 'TYPE', PARAM = 'PARAM', ANNOTATION = 'ANNOTATION', ATTRIBUTE = 'ATTRIBUTE',
   CONSTRUCTOR = 'CONSTRUCTOR', STATICBLOCK = 'STATICBLOCK'
};

class ContextInfo {
   public attempting: boolean;
   public context: ParseContext;
   constructor(context: ParseContext, attempt: boolean) {
      this.attempting = attempt;
      this.context = context;
   }

   public toString(): string {
      return `${this.context} (${this.attempting ? 'a' : 'na'})`;
   }
}

class AttemptInfo {
   public tokenIdx: number;
   public name: string | undefined;
   constructor(name: string, tokenIdx: number) {
      this.tokenIdx = tokenIdx;
      this.name = name;
   }
}

export abstract class Parser<T extends Token, Z extends IR> {
   protected lexer: Lexer<T>;
   protected pushedContexts: ContextInfo[] = [];
   protected logger: Logger;
   // Contexts that log info
   protected verboseContext: Set<ParseContext> = new Set<ParseContext>([]);
   // If set to true it will also log  info for the attempts (not only on confirmed branches)
   private logAttempting: boolean = false;

   private tokens: T[] = [];
   private tokenIndex: number = 0;
   // Here we store the index of the token we were analyzing from tokens list when the attempt began
   // this way when we desist the attempt we can recover the previous index

   // private tokenIdxStack: number[] = [];
   private tokenIdxStack: AttemptInfo[] = [];

   protected failedAttemptError: Error = new Error('Failed attempt');

   constructor(lexer: Lexer<T>, logger: Logger) {
      this.logger = logger;
      this.lexer = lexer;
      const token: T = this.lexer.nextToken();
      this.tokenIndex = 0;
      this.tokens.push(token);
   }

   protected beginAttempt(name: string): void {
      this.log(`Starting attempt ${name}`);
      this.tokenIdxStack.push(new AttemptInfo(name, this.tokenIndex));
   }

   /**
    * Informs if the parser is attempting a branch or not. To know it we 
    * just need to check the tokenIdxStack. If there is a value we are inside an attempt
    * (the exact length is not important, the attempts can be nested)
    * @returns 
    */
   protected isAttempting(): boolean {
      return this.tokenIdxStack.length > 0;
   }

   /**
    * Rolling back attempts reset the token index to continue where we started 
    * the attempt as if nothing was attempted
    */
   protected rollbackAttempt(): void {
      if (this.tokenIdxStack.length == 0) {
         throw new Error(`Cannot rollback when not attempt is in place...${this.tokenIdxStack}`);
      }
      const attempt: AttemptInfo = this.tokenIdxStack.pop() as AttemptInfo;
      this.log(`Rolled back attempt ${attempt.name} on ${this.lookAhead()}`);
      this.tokenIndex = attempt.tokenIdx;
   }

   /**
    * Helper method that allows attempting a branch and if it fails rollsback 
    * returning  false
    * @param what 
    * @param doIt 
    * @returns 
    */
   protected attempt(what: string, doIt: () => IR): boolean {
      this.log(`Starting attempt of ${what} with ${this.lookAhead()}`);
      this.beginAttempt(what);
      this.log(`Started attempt...doing it`);
      try {
         doIt.call(this);
      } catch (e) {
         if (e !== this.failedAttemptError) {
            this.logger.error(`Error on attempt ${e}`);
            const stack = (e as Error).stack?.split("\n").slice(1, 4).join("\n");
            this.logger.error(stack); // to view the result
         }
         return false;
      } finally {
         this.rollbackAttempt();
      }
      return true;
   }

   /**
    * Utility method to show a message from parser
    * @param message 
    * @param context 
    */
   protected log(message: string) {
      if (this.logAttempting || !this.isAttempting()) {
         let depthString: string = '';
         for (let i: number = 0; i < this.pushedContexts.length; i++) {
            depthString += '->';
         }
         this.logger.info(`${depthString} ${this.pushedContexts.length > 0 ? '[' + this.pushedContexts[this.pushedContexts.length - 1] + ']' : '[--]'} - ${message}`);
      }
   }

   /**
    * Get next token that will be obtained by the method nextToken. It does not advance with the next one
    * @returns 
    */
   protected lookAhead(): T {
      return this.tokens[this.tokenIndex];
   }

   /**
    * Insert a new context to define what is being done (interpreting a method signature, a while, a comment and so on)
    * A context is just a label that we set to identify where is the parser working
    * @param context 
    */
   protected pushContext(context: ParseContext): void {
      this.log(`Pushing context ${context}`);
      const attempting: boolean = this.isAttempting();
      this.pushedContexts.push(new ContextInfo(context, attempting));
      this.log(`[P][${attempting ? 'a' : 'na'}] >>>> Context stack is ${Utils.prettyPrint(this.pushedContexts)} at line ${this.lookAhead().line}`);
   }

   /**
    * After analyzing a context it can be popped to continue in the previous context
    * @returns 
    */
   protected popContext(): ParseContext {
      return (this.pushedContexts.pop() as ContextInfo).context;
   }

   /**
    * Returns the name of the resource being parsed (the name of the apex class, trigger, etc..)
    * @returns 
    */
   protected getResourceName(): string {
      return this.lexer.getResourceName();
   }

   /**
    * Obtains the next token and prepares a new lookahead
    * @returns 
    */
   protected nextToken(): T {
      const ret: T = this.tokens[this.tokenIndex];
      if (ret) { // If there are still tokens continue reading for next request
         this.tokenIndex++;
         if (this.tokenIndex == this.tokens.length) { // Read new token for the lookahead
            const token: T = this.lexer.nextToken();
            this.tokens.push(token);
         }
      }
      return ret;
   }

   protected createSnapshot(): string {
      let ret: string = '';
      let line: number = 0;
      for (let idx = this.tokenIndex; idx < this.tokens.length; idx++) {
         if (this.tokens[idx].line !== line) {
            ret += '\n';
            line = this.tokens[idx].line;
         }
         ret += this.tokens[idx].text + ' ';
      }
      return `///${this.tokens[this.tokenIndex].line}:${this.tokens[this.tokenIndex].offset} - ${ret} - ${this.tokens[this.tokens.length - 1].line}:${this.tokens[this.tokens.length - 1].offset}///`;
   }

   /**
    * Returns the object with the IR (Intermediate Representation)
    */
   public abstract parse(): Z;

}