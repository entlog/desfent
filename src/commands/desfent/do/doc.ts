import { SfCommand, Flags } from "@salesforce/sf-plugins-core";
import { Messages } from "@salesforce/core";
import { Token } from "../../../lexer/Lexer.js";
import { fileURLToPath } from 'url';
import path from 'path';
import TechFactory from "../../../TechFactory.js";
import { Parser } from "../../../parser/Parser.js";
import IR from "../../../ir/IR.js";
import Utils, { Colour } from "../../../Utils.js";
import HtmlFormatter from "../../../formatters/HtmlFormatter.js";
import fs from 'graceful-fs';
import TreeHelper from "../../../ir/IRGroup.js";
import IRGroup from "../../../ir/IRGroup.js";

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages("desfent", "desfent.do.doc");

export default class DesfentDoDoc extends SfCommand<number> {
   public static readonly summary = messages.getMessage("summary");
   public static readonly description = messages.getMessage("description");
   public static readonly examples = messages.getMessages("examples");
   
   public static readonly flags = {
      file: Flags.string({
         summary: messages.getMessage("flags.file.summary"),
         description: messages.getMessage("flags.file.description"),
         char: "f",
         required: false,
         exists: true,
         exactlyOne: [ 'directory' ]
      }),
      out: Flags.directory({
         summary: messages.getMessage("flags.out.summary"),
         char: "o",
         required: true,
      }),
      directory: Flags.directory({
         summary: messages.getMessage("flags.directory.summary"),
         description: messages.getMessage("flags.directory.description"),
         char: "d",
         required: false,
         exists: true,
         exactlyOne: [ 'file' ]
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
      const files:string[] = [];
      if (flags.file) {
         files.push(path.resolve('.', flags.file));
      } else {
         // Read from directory
         fs.readdirSync(flags.directory as string).forEach(f => files.push(path.resolve(flags.directory as string,f)));
      }
      this.log(`Handling files: ${files}`);
      const group:IRGroup  = new IRGroup();
      for (let idx = 0; idx < files.length; idx++) {
         const parser: Parser<Token, IR> = await TechFactory.getParser(files[idx]);
         const ir: IR = parser.parse();
         if (ir.getErrors().length > 0) {
            this.log(
               `Problems parsing: ${Utils.colourize(
                  ir.getErrors().toString(),
                  Colour.RED
               )}`
            );
         } else {
            this.log(`Parsed: ${ir.name} (${idx}/${files.length})`);
            group.addTree(ir.name, ir);
         }
      }
      HtmlFormatter.prepare(flags.out, this.log.bind(this));
      for (const ir of group.getTrees()) {
         if (ir.valid) {
            HtmlFormatter.format(ir, group, flags.out, this.log.bind(this));
         }
      }
      
      await ((time: number) => {
         return new Promise((rs, rj) => setTimeout(rs, time));
      })(2000);
      return 0;
   }
}
