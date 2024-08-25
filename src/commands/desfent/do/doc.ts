import { SfCommand, Flags } from "@salesforce/sf-plugins-core";
import { Logger, Messages } from "@salesforce/core";
import { Token } from "../../../lexer/Lexer.js";
import path from "path";
import TechFactory from "../../../TechFactory.js";
import { Parser } from "../../../parser/Parser.js";
import IR from "../../../ir/IR.js";
import Utils, { Colour } from "../../../Utils.js";
import HtmlFormatter from "../../../formatters/HtmlFormatter.js";
import fs from "graceful-fs";
import IRGroup from "../../../ir/IRGroup.js";

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages("@entlog/desfent", "desfent.do.doc");

class AnalysisStats {
   public analyzed:string[] = [];
   public nature2analyzed:Map<string, string[]> = new Map<string, string[]>();
   public failed2message:Map<string, string> = new Map<string, string>();

   public add(filename:string, ir:IR):void {
      this.analyzed.push(filename);
      let bynature:string[]|undefined = this.nature2analyzed.get(ir.nature);
      if (!bynature) {
         bynature = [];
         this.nature2analyzed.set(ir.nature, bynature);
      }
      bynature.push(filename);
      if (!ir.valid) {
         this.failed2message.set(filename, ir.getErrors().join(';'));
      }
   }

}

export default class DesfentDoDoc extends SfCommand<number> {
   public static readonly summary = messages.getMessage("summary");
   public static readonly description = messages.getMessage("description");
   public static readonly examples = messages.getMessages("examples");
   private logger:Logger|undefined;

   private stats:AnalysisStats = new AnalysisStats();

   public static readonly flags = {
      file: Flags.string({
         summary: messages.getMessage("flags.file.summary"),
         description: messages.getMessage("flags.file.description"),
         char: "f",
         required: false,
         exists: true,
         exactlyOne: ["directory"],
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
         exactlyOne: ["file"],
      }),
      showstats: Flags.boolean({
         summary: messages.getMessage("flags.showstats.summary"),
         description: messages.getMessage("flags.showstats.description"),
         required: false
      })
   };

   private getFilesUnderDir(dir: string): string[] {
      const dirs:string[] = [dir];
      const files:string[] = [];
      while (dirs.length > 0) {
         const currdir:string = dirs.pop() as string;
         fs.readdirSync(currdir).forEach(f => {
            let fullpath = path.resolve(currdir, f);
            this.logger!.info(`Checking file ${fullpath}`);
            const stat = fs.lstatSync(fullpath);
            if (stat.isDirectory()) {
               dirs.push(fullpath);
            } else {
               files.push(fullpath);
            }
         });
      }
      return files;
   }

   

   public async run(): Promise<number> {
      const { flags } = await this.parse(DesfentDoDoc);
      this.logger = await Logger.child("Command");
      this.spinner.start('Analyzing parameters...');

      let files: string[] = [];
      if (flags.file) {
         if (!fs.existsSync(flags.file as string)) {
            throw new Error(`File not found ${flags.file}`)
         }
         files.push(path.resolve(".", flags.file));
      } else {
         if (!fs.existsSync(flags.directory as string)) {
            throw new Error(`Directory not found ${flags.directory}`)
         }
         files = this.getFilesUnderDir(flags.directory as string);
      }

      this.spinner.stop();
      this.progress.start(0, {}, {
         format: 'Processing files | {bar} | {value}/{total} % processed | Elapsed: {duration_formatted}',
      });
      this.progress.setTotal(100);

      this.logger.info(`Handling files: ${files}`);
      const group: IRGroup = new IRGroup();
      for (let idx = 0; idx < files.length; idx++) {
         this.progress.update(Math.floor(idx * 800 / files.length) / 10); // 80%

         let parser: Parser<Token, IR> | undefined = await TechFactory.getParser(files[idx]);
         if (!parser) { // No parser for this file..ignore
            this.logger.info(`Ignoring file ${files[idx]}`);
            continue;
         }
         this.logger.info(`Processing ${files[idx]}`);
         const irs: IR[] = parser.parse();
         for (let ir of irs) {
            if (ir.getErrors().length > 0) {
               this.logger.warn(
                  `Problems parsing: ${ir.name} on ${files[idx]} - ${Utils.colourize(
                     ir.getErrors().toString(),
                     Colour.RED
                  )}`
               );
            } else {
               this.logger.info(`Parsed: ${ir.name} (${idx + 1}/${files.length})`);
            }
            group.addTree(ir.name, ir, files[idx]);
            this.stats.add(files[idx], ir);
         }
         
         parser = undefined;
      }
      await HtmlFormatter.prepare(flags.out);
      HtmlFormatter.format(group, flags.out,
         (current: number, total: number) => {
            this.progress.update(80 + Math.floor((current * 200 / total) / 10));
         });
      this.progress.finish();

      if (flags.showstats) {
         this.log('\n----- STATS -----');
         this.log(`* ${this.stats.analyzed.length} files analyzed`);
         
         this.stats.nature2analyzed.forEach((files, nature, m) => {
            this.log(`** ${nature}: ${files.length} files analyzed`);
         });
         this.log(`\n* ${this.stats.failed2message.size} anaylisis errors found`);
         if (this.stats.failed2message.size > 0) {
            this.log('\n----- ERRORS -----');
            this.stats.failed2message.forEach((file, error, map) => {
               this.log(`File ${file}: ${error}`);
            });
         }
         this.log('\n');
      }
      await ((time: number) => {
         return new Promise((rs, rj) => setTimeout(rs, time));
      })(2000);
      return 0;
   }
}
