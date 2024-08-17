

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { Token } from '../../../lexer/Lexer.js';

import TechFactory from '../../../TechFactory.js';
import { Parser } from '../../../parser/Parser.js';
import IR from '../../../ir/IR.js';
import Utils, { Colour } from '../../../Utils.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url)
const messages = Messages.loadMessages('desfent', 'desfent.do.doc');



export default class DesfentDoDoc extends SfCommand<number> {
   public static readonly summary = messages.getMessage('summary');
   public static readonly description = messages.getMessage('description');
   public static readonly examples = messages.getMessages('examples');

   public static readonly flags = {
      file: Flags.string({
         summary: messages.getMessage('flags.file.summary'),
         description: messages.getMessage('flags.file.description'),
         char: 'f',
         required: true
      }),
   };

   public async run(): Promise<number> {
      const { flags } = await this.parse(DesfentDoDoc);
      this.log(`Generating documentation for file ${flags.file}`);

      // const lexer: Lexer<Token> = await LexerFactory.getLexer(flags.file);
      // let token: Token;
      // let count: number = 0;
      // while ((token = lexer.nextToken()).type != TOKENTYPE_EOF) {
      //    this.log(`Obtained token: ${token}`);
      //    count++;
      //    if (count > 100) {
      //       this.log(`Something wrong ${count} tokens?`)
      //       break;
      //    }
      // }

      const parser: Parser<Token, IR> = await TechFactory.getParser(flags.file);
      const ir: IR = parser.parse();
      if (ir.getErrors().length > 0) {
         this.log(`Problems parsing: ${Utils.colourize(ir.getErrors().toString(), Colour.RED)}`)
      } else {
         this.log(`Parsed: ${ir}`);
      }



      await ((time: number) => {
         return new Promise((rs, rj) => setTimeout(rs, time));
      })(2000);
      return 0;
   }
}
