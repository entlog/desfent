import { Logger } from "@salesforce/core";
import Stream from "./Stream.js";

export class TokenType {
   private type: string;
   
   constructor(name: string) {
      this.type = name;
   }
   get name(): string {
      return this.type;
   }
   toString(): string {
      return "*" + this.type + "*";
   }
}

export const TOKENTYPE_EOF = new TokenType("EOF");

export abstract class Token {
   private _line: number;
   private _offset: number;
   private _text: string;
   private _type: TokenType;
   
   constructor(type: TokenType, text: string, line?: number, offset?: number) {
      this._type = type;
      this._text = text;
      this._line = line ?? 0;
      this._offset = offset ?? 0;
   }
   get line(): number {
      return this._line;
   }
   get offset(): number {
      return this._offset;
   }
   get text(): string {
      return this._text;
   }
   /**
   * Helper method to avoid calling over and over the toLowerCase
   */
   get ltext(): string {
      return this._text?.toLowerCase();
   }
   get type(): TokenType {
      return this._type;
   }
   setPosition(line: number, offset: number): Token {
      this._line = line;
      this._offset = offset;
      return this;
   }
   toString(): string {
      return (
         this._type +
         ' - "' +
         this._text +
         '" (' +
         this._line +
         ", " +
         this._offset +
         ")"
      );
   }
}

const BUFFER_MINLENGTH: number = 4096;
const CHAR_EOF = "\0";

export default abstract class Lexer<T extends Token> {
   protected logger: Logger;
   protected stream: Stream;
   private buffer: string = "";
   private resourceName: string;
   // private buffStart: number = 0;
   // private buffAhead: number = 0;
   
   // This counts the absolute position of the file reading cursor as a single value.
   private cursorAbsIndex: number = 0;
   // Line and char index give more human friendly representation of absIndex
   protected cursorLine: number = 0;
   protected cursorLineOffset: number = 0;
   
   // Look ahead reading position
   private laAbsIndex: number = 0;
   // Lookahead line and char indexes
   private laLine: number = 0;
   private laLineOffset: number = 0;
   
   private fileEnded: boolean = false;
   
   public constructor(resourceName: string, stream: Stream, l: Logger) {
      this.resourceName = resourceName;
      this.logger = l;
      this.stream = stream;
   }
   
   /**
   * Name of the resource being analyzed
   */
   public getResourceName(): string {
      return this.resourceName;
   }
   
   /**
   * Method that resets the look ahead and returns to
   * the initial position
   */
   protected desist(): void {
      // this.buffAhead = this.buffStart;
      this.laLineOffset = this.cursorLineOffset;
      this.laLine = this.cursorLine;
      this.laAbsIndex = this.cursorAbsIndex;
   }
   
   /**
   * Function that moves the reading cursor to the last position read by the
   * look ahead cursor (indicating that the lookahead is accepted and we can
   * continue from that position)
   */
   protected consume(): void {
      // this.buffAhead = this.buffStart;
      this.cursorLineOffset = this.laLineOffset;
      this.cursorLine = this.laLine;
      this.cursorAbsIndex = this.laAbsIndex;
      // this.logger.info(`Consumed until (${this.laLine}, ${this.laLineOffset} / ${this.laAbsIndex})`)
   }
   
   /**
   * Function that gets the next character from buffer but using the look ahead pointer
   * (meaning the character is not consumed, we only see next character ahead)
   * If we keep calling this one we will see the whole file and with desist we can
   * go back to the start position before the first look ahead
   * @returns
   */
   protected lookAhead(): string {
      this.fillBufferIfNeeded();
      if (this.laAbsIndex < this.buffer.length) {
         const c: string = this.buffer[this.laAbsIndex];
         this.laAbsIndex++;
         this.laLineOffset++;
         if (c == "\n") {
            this.logger.info(
               `Detected end of line at (${this.laLine}, ${this.laLineOffset})`
            );
            this.laLine++;
            this.laLineOffset = 0;
         }
         return c;
      } else {
         return CHAR_EOF;
      }
   }
   
   /**
   * Function that checks if we have in the buffer at least the minimum number
   * of characters (after the look ahead position). And if not reads until
   * we have the minimum amount. It also clears the already used characters
   * in the buffer (the ones before buffStart)
   */
   protected fillBufferIfNeeded(): void {
      if (
         !this.fileEnded &&
         this.buffer.length - this.laAbsIndex < BUFFER_MINLENGTH
      ) {
         this.fillBuffer();
         
         if (this.cursorAbsIndex > 0) {
            // Remove unnecessary characters (already used)
            this.buffer = this.buffer.substring(this.cursorAbsIndex);
            this.laAbsIndex -= this.cursorAbsIndex;
            this.cursorAbsIndex = 0;
         }
      }
   }
   
   /**
   * Function that fills the buffer with BUFFER_MINLENGTH characters from
   * the file
   */
   protected fillBuffer(): void {
      try {
         const readChars = this.stream.read(BUFFER_MINLENGTH);
         if (readChars.length === 0) {
            this.fileEnded = true;
            this.stream.close();
            
         } else {
            this.logger.info(`Read length ${readChars.length}`);
            this.buffer += readChars;
         }
         this.logger.info(`Buffer length: ${this.buffer.length}: ${this.buffer}`);
      } catch (ioe) {
         throw new Error("Problems reading file" + ioe);
      }
   }
   
   public dismiss():void {
      if (this.stream.isOpen()) {
         this.stream.close();
         this.buffer = '';
      }
   }
   
   /**
   * Method that tells whether the cursor reached the end of file
   * @returns
   */
   public isEOF(): boolean {
      const ret: boolean =
      this.fileEnded && this.cursorAbsIndex == this.buffer.length;
      this.logger.info(
         `EOF check: ${ret}, File ended: ${this.fileEnded}, cursor Abs Pos: ${this.cursorAbsIndex}, buff length: ${this.buffer.length}`
      );
      if (!ret && this.fileEnded) {
         this.logger.info(`Reaching end "${this.getSnapshot().charCodeAt(0)}"`);
      }
      return ret;
   }
   
   /**
   * Method that tells whether the look ahead cursor reached the end of file
   * @returns
   */
   public isLookAheadEOF(): boolean {
      return this.fileEnded && this.laAbsIndex == this.buffer.length;
   }
   
   /**
   * Method that returns a small substring around the cursor
   */
   public getSnapshot(): string {
      return this.buffer.substring(
         this.cursorAbsIndex,
         this.buffer.length - this.cursorAbsIndex > 100
         ? this.cursorAbsIndex + 100
         : this.buffer.length
      );
   }
   
   /**
   * Function that counts the number of times the regex appears in the
   * text passed as "where" param
   * @param sregex
   * @param where
   * @returns
   */
   private countOccurrences(sregex: string, where: string): number {
      const re: RegExp = new RegExp(sregex, "g");
      const ret: number | undefined = where.match(re)?.length;
      if (ret === undefined) {
         return 0;
      }
      return ret;
   }
   
   /**
   * Method that attempts to match a regex that can take several lines and therefore could not match
   * in the buffer
   * @param sreStart 
   * @param sreRemaining 
   * @param sreAfter 
   * @returns 
   *
   public attemptLongRegex(sreStart: string, sreContents: string, sreAfter: string | null): string | null {
   this.fillBufferIfNeeded();
   let localBuff: string = this.buffer.substring(this.cursorAbsIndex, this.buffer.length);
   const gre: RegExp = new RegExp('^(' + sreStart + ').*', 's') // s flag means dot all
   const matches: string[] | null = gre.exec(localBuff);
   let matched: string | null = null;
   
   if (matches) { // The buffer matches at least the beginning so we can attempt to match the whole expression
   const re: RegExp = new RegExp("^(" + sreStart + sreContents + ")" + (sreAfter != null ? sreAfter : '') + '.*', 's');
   let localBuff = this.lookAhead();
   let matches: string[] | null = re.exec(localBuff);
   while (!matches && !this.isLookAheadEOF()) {
   let c: string = this.lookAhead();
   localBuff += c;
   matches = re.exec(localBuff);
   }
   if (matches) {
   // Continue matching until it fails
   do {
   let c: string = this.lookAhead();
   localBuff += c;
   matches = re.exec(localBuff);
   } while (matches && !this.isLookAheadEOF());
   if (!matches) {
   localBuff = localBuff.substring(0, localBuff.length - 1);
   this.la
   }
   matched = matches[1];
   } else {
   this.desist();
   }
   return matched;
   } else {
   return null;
   }
   } */
   
   public attemptRegex(
      sre: string,
      sreAfter: string | null,
      multiline: boolean = false,
      cInsensitive: boolean = false
   ): string | null {
      this.fillBufferIfNeeded();
      let localBuff: string = this.buffer.substring(
         this.cursorAbsIndex,
         this.buffer.length
      );
      const gre: RegExp = new RegExp(
         "^(" + sre + ")" + (sreAfter ?? ".*"),
         (multiline ? "s" : "") + (cInsensitive ? "i" : "")
      ); // s flag means dot all
      let matches: string[] | null = gre.exec(localBuff);
      let matched: string | null = null;
      
      if (matches) {
         // Buffer matches...do with the lookahead to update cursors
         matched = matches[1];
         const eol: number = this.countOccurrences("\n", matched);
         // this.logger.info(`Occurrences of eol in match "${matched}" = ${eol}`)
         this.laAbsIndex += matched.length;
         this.laLine += eol;
         if (eol > 0) {
            this.laLineOffset = matched.length - matched.lastIndexOf("\n");
         } else {
            this.laLineOffset += matched.length;
         }
         // this.logger.info(`After "${matched}" coordinates (${this.laLine}, ${this.laLineOffset} / ${this.laAbsIndex})`)
      }
      return matched;
   }
   
   /**
   * Method that skips characters while they match the regex expression
   * @param re
   */
   protected skip(re: string): void {
      let c: string;
      // this.logger.info(`Before skip (${this.laLine}, ${this.laLineOffset} / ${this.laAbsIndex})`);
      do {
         c = this.lookAhead();
         
         if (new RegExp(re).test(c)) {
            this.consume();
         } else {
            this.desist();
            break;
         }
         // this.logger.info(`Skipped until (${this.laLine}, ${this.laLineOffset} / ${this.laAbsIndex})`)
      } while (!this.isEOF());
      // this.logger.info(`After skip (${this.laLine}, ${this.laLineOffset} / ${this.laAbsIndex})`);
   }
   
   abstract nextToken(): T;
}
