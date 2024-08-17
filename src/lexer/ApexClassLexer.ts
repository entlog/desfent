import { Logger, LoggerLevel } from '@salesforce/core';
import Stream from './Stream.js';
import Lexer, { Token, TokenType, TOKENTYPE_EOF } from './Lexer.js';

const TOKENTYPE_CODE_RESERVEDWORD = new TokenType('CODE_RESERVEDWORD');
const TOKENTYPE_CODE_STRINGLITERAL = new TokenType('CODE_STRING');
const TOKENTYPE_CODE_QUERY = new TokenType('CODE_QUERY');
// Curly brackets { }
const TOKENTYPE_CODE_CBRACKET_START = new TokenType('CODE_CBRACKET_START');
const TOKENTYPE_CODE_CBRACKET_END = new TokenType('CODE_CBRACKET_END');
// Parenthesis
const TOKENTYPE_CODE_RBRACKET_START = new TokenType('CODE_RBRACKET_START');
const TOKENTYPE_CODE_RBRACKET_END = new TokenType('CODE_RBRACKET_END');
// Square bracket [ ]
const TOKENTYPE_CODE_SBRACKET_START = new TokenType('CODE_SBRACKET_START');
const TOKENTYPE_CODE_SBRACKET_END = new TokenType('CODE_SBRACKET_END');

const TOKENTYPE_CODE_LESSEQUAL = new TokenType('CODE_LESSEQUAL');
const TOKENTYPE_CODE_LESS = new TokenType('CODE_LESS');
const TOKENTYPE_CODE_EQUALS = new TokenType('CODE_EQUALS');
const TOKENTYPE_CODE_GREATEREQUAL = new TokenType('CODE_GREATEREQUALS');
const TOKENTYPE_CODE_GREATER = new TokenType('CODE_GREATER');
const TOKENTYPE_CODE_NOTEQUALS = new TokenType('CODE_NOTEQUALS');
const TOKENTYPE_CODE_ASSIGN = new TokenType('CODE_ASSIGN');
const TOKENTYPE_CODE_DOT = new TokenType('CODE_DOT');

const TOKENTYPE_CODE_ADDASSIGNMENT = new TokenType('CODE_ADDASSIGNMENT');
const TOKENTYPE_CODE_SUBASSIGNMENT = new TokenType('CODE_SUBASSIGNMENT');
const TOKENTYPE_CODE_MULTIPLYASSIGNMENT = new TokenType('CODE_MULTIPLYASSIGNMENT');
const TOKENTYPE_CODE_DIVIDEASSIGNMENT = new TokenType('CODE_DIVIDEASSIGNMENT');
const TOKENTYPE_CODE_ADD = new TokenType('CODE_ADD');
const TOKENTYPE_CODE_SUB = new TokenType('CODE_SUB');
const TOKENTYPE_CODE_MULTIPLY = new TokenType('CODE_MULTIPLY');
const TOKENTYPE_CODE_DIVIDE = new TokenType('CODE_DIVIDE');
const TOKENTYPE_CODE_SUBUNARY = new TokenType('CODE_SUBUNARY');
const TOKENTYPE_CODE_ADDUNARY = new TokenType('CODE_ADDUNARY');
const TOKENTYPE_CODE_NUMBER = new TokenType('CODE_NUMBER');
const TOKENTYPE_CODE_ANNOTATION = new TokenType('CODE_ANNOTATION');


const TOKENTYPE_CODE_COMMA = new TokenType('CODE_COMMA');
const TOKENTYPE_CODE_SEMICOLON = new TokenType('CODE_SEMICOLON');

const TOKENTYPE_CODE_WORD = new TokenType('CODE_WORD');

// Multiline comment start
const TOKENTYPE_COMMENT_ML_START = new TokenType('COMMENT_ML_START');
const TOKENTYPE_COMMENT_SL = new TokenType('COMMENT_SL');
const TOKENTYPE_COMMENT_ML_END = new TokenType('COMMENT_ML_END');
// Javadoc comment (documentation)
const TOKENTYPE_COMMENT_JD_START = new TokenType('COMMENT_JD_START');
const TOKENTYPE_COMMENT_WORD = new TokenType('COMMENT_WORD');

const TOKENTYPE_COMMENT_JD_ANNOTATION = new TokenType('COMMENT_JD_ANNOTATION');

export { TOKENTYPE_CODE_RESERVEDWORD, TOKENTYPE_CODE_STRINGLITERAL, TOKENTYPE_CODE_QUERY, TOKENTYPE_CODE_CBRACKET_START, TOKENTYPE_CODE_CBRACKET_END, TOKENTYPE_CODE_RBRACKET_START, TOKENTYPE_CODE_RBRACKET_END, TOKENTYPE_CODE_SBRACKET_START, TOKENTYPE_CODE_SBRACKET_END, TOKENTYPE_CODE_LESSEQUAL, TOKENTYPE_CODE_LESS, TOKENTYPE_CODE_EQUALS, TOKENTYPE_CODE_GREATEREQUAL, TOKENTYPE_CODE_GREATER, TOKENTYPE_CODE_NOTEQUALS, TOKENTYPE_CODE_ASSIGN, TOKENTYPE_CODE_DOT, TOKENTYPE_CODE_ADD, TOKENTYPE_CODE_SUB, TOKENTYPE_CODE_MULTIPLY, TOKENTYPE_CODE_DIVIDE, TOKENTYPE_CODE_SUBUNARY, TOKENTYPE_CODE_ADDUNARY, TOKENTYPE_CODE_NUMBER, TOKENTYPE_CODE_ANNOTATION, TOKENTYPE_CODE_COMMA, TOKENTYPE_CODE_SEMICOLON, TOKENTYPE_CODE_WORD, TOKENTYPE_COMMENT_ML_START, TOKENTYPE_COMMENT_SL, TOKENTYPE_COMMENT_ML_END, TOKENTYPE_COMMENT_JD_START, TOKENTYPE_COMMENT_WORD, TOKENTYPE_COMMENT_JD_ANNOTATION };

const BLANKS: string = '[ \n\r\t\0]';
const BLANKSORSEPARATOR: string = '[ \n\r\t;,\\()\\[\\]]';
const NOTBLANKS: string = '[^ \n\r\t]';

const TOKEN_TRIGGER = "trigger";
const TOKEN_ON = "on";
const TOKEN_BEFORE = "before";
const TOKEN_AFTER = "after";
const TOKEN_INSERT = "insert";
const TOKEN_UPDATE = "update";
const TOKEN_DELETE = "delete";

const APEX_RESERVEDWORDS: string[] = [
   'public', 'private', 'null', 'return', 'static', 'class', 'if', 'for', 'while',
   'do', 'virtual', 'abstract', 'enum', 'override', 'extends', TOKEN_TRIGGER, TOKEN_BEFORE, TOKEN_AFTER,
   TOKEN_INSERT, TOKEN_UPDATE, TOKEN_DELETE, TOKEN_ON
];
export class ApexToken extends Token { }

const enum LexerContext {
   CODE = 'code',
   MLCOMMENT = 'mlcomment'
};

export default class ApexClassLexer extends Lexer<ApexToken> {
   lexerContext: LexerContext = LexerContext.CODE;

   eofToken: ApexToken = new ApexToken(TOKENTYPE_EOF, '\0', this.cursorLine, this.cursorLineOffset);

   public constructor(resourceName: string, stream: Stream, l: Logger) {
      super(resourceName, stream, l);
   }
   private eofCount: number = 0;

   attemptReservedWord(): ApexToken | null {
      let ret: ApexToken | null = null;
      for (const text of APEX_RESERVEDWORDS) {
         let attempt: string | null = this.attemptRegex(text, BLANKSORSEPARATOR);
         if (attempt != null) {
            ret = new ApexToken(TOKENTYPE_CODE_RESERVEDWORD, attempt, this.cursorLine, this.cursorLineOffset);
            this.consume();
            break;
         }
      }
      return ret;
   }

   nextTokenOnCode(): ApexToken | null {
      let token: ApexToken | null;
      token = this.attemptReservedWord();
      if (token != null) {
         return token;
      }
      let tokenText: string | null;

      if ((tokenText = this.attemptRegex("/\\*{2,}", null)) != null) {
         token = new ApexToken(TOKENTYPE_COMMENT_JD_START, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
         this.lexerContext = LexerContext.MLCOMMENT;
      } else if ((tokenText = this.attemptRegex("/\\*", null)) != null) {
         token = new ApexToken(TOKENTYPE_COMMENT_ML_START, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
         this.lexerContext = LexerContext.MLCOMMENT;
      } else if ((tokenText = this.attemptRegex('\'[^\'\\\\]*(?:\\\\.[^\'\\\\]*)*\'', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_STRINGLITERAL, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('//[^\n]*', '[\n\0]')) != null) {
         token = new ApexToken(TOKENTYPE_COMMENT_SL, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume;
      } else if ((tokenText = this.attemptRegex('\\[ *SELECT[^\\]]+\\]', null, true, true)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_QUERY, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\{', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_CBRACKET_START, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('}', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_CBRACKET_END, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\(', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_RBRACKET_START, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\)', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_RBRACKET_END, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\[', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_SBRACKET_START, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex(']', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_SBRACKET_END, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex(',', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_COMMA, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex(';', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_SEMICOLON, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('[0-9]+(?:\\.[0-9]+)?', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_NUMBER, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('<=', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_LESSEQUAL, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('>=', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_GREATEREQUAL, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('==', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_EQUALS, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('!=', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_NOTEQUALS, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('>', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_GREATER, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('<', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_LESS, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('=', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_ASSIGN, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\+\\+', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_ADDUNARY, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('--', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_SUBUNARY, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\+=', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_ADDASSIGNMENT, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('-=', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_SUBASSIGNMENT, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\*=', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_MULTIPLYASSIGNMENT, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('/=', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_DIVIDEASSIGNMENT, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\+', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_ADD, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('-', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_SUB, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\*', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_MULTIPLY, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('/', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_DIVIDE, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('\\.', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_DOT, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('@[a-zA-Z0-9]+', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_ANNOTATION, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('[^ \\n\\r\\t{}()\\[\\],;\\.<>=\\+\\-\']+', null)) != null) {
         token = new ApexToken(TOKENTYPE_CODE_WORD, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      }
      return token;
   }

   nextTokenOnComment(): ApexToken | null {
      let token: ApexToken | null;
      let tokenText: string | null;

      if ((tokenText = this.attemptRegex('[^ \\n\\t]*\\*+/', null)) != null) {
         token = new ApexToken(TOKENTYPE_COMMENT_ML_END, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
         this.lexerContext = LexerContext.CODE;
      } else if ((tokenText = this.attemptRegex('@[a-zA-Z0-9]+', BLANKS)) != null) {
         token = new ApexToken(TOKENTYPE_COMMENT_JD_ANNOTATION, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else if ((tokenText = this.attemptRegex('[^ \\t\\n\\r]+', BLANKS)) != null) {
         token = new ApexToken(TOKENTYPE_COMMENT_WORD, tokenText, this.cursorLine, this.cursorLineOffset);
         this.consume();
      } else {
         throw new Error(`Not able to interpret comment ${this.getSnapshot()}`);
      }
      return token;
   }

   nextToken(): Token {
      this.skip(BLANKS);

      let token: ApexToken | null;
      if (this.isEOF()) {
         this.logger.info('Detected END OF FILE');
         this.eofCount++;
         if (this.eofCount > 5) {
            throw new Error(`Too many eof invoked on lexer (${this.eofCount}`);
         }
         return this.eofToken.setPosition(this.cursorLine, this.cursorLineOffset);
      } else if (this.lexerContext == LexerContext.MLCOMMENT) {
         token = this.nextTokenOnComment();
      } else {
         token = this.nextTokenOnCode();
      }
      this.logger.info(`Returning token ${token}`);
      if (!token) {
         throw new Error('Found problem reading file (' + this.isEOF() + '). No tokens identified: ' + this.getSnapshot());
      }
      return token;
   }


}