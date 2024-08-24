import { Logger } from "@salesforce/core";
import fs from "graceful-fs";

export default class Stream {
   private fd: number | null = null;
   private file: string;
   private logger: Logger;
   private decoder = new TextDecoder("UTF-8");
   
   constructor(file: string, logger: Logger) {
      this.file = file;
      this.logger = logger;
   }
   
   private open(): void {
      this.fd = fs.openSync(this.file, "r");
   }
   public read(count: number): string {
      const b = Buffer.alloc(count);
      let read: number = fs.readSync(this.fd as number, b, 0, count, null);
      if (read > 0) {
         return this.decoder.decode(b).substring(0, read);
      }
      return "";
   }
   
   public close(): void {
      if (this.fd != null) {
         fs.close(this.fd);
         this.fd = null;
         
         this.logger.info("Closed stream for file " + this.file);
      }
   }
   public isOpen(): boolean {
      return this.fd !== null;
   }
   
   public static async open(file: string): Promise<Stream> {
      if (!file) {
         throw new Error("Empty file");
      }
      const logger: Logger = await Logger.child("Stream");
      
      const str: Stream = new Stream(file, logger);
      str.open();
      return str;
   }
}
