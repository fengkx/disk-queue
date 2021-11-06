import * as fs from "fs";
import { EventEmitter } from "events";
import lineByLine, { endSymobl } from "./n-readlines";

type Serializer = (data: unknown) => string;
type DeSerializer = (str: string) => unknown;
export interface Options {
  filePath: string;
  serializer?: Serializer;
  deserializer?: DeSerializer;
}
export class DiskQueue extends EventEmitter {
  protected holding = false;
  protected fd: number;
  protected liner: lineByLine;
  public serialize: Serializer;
  public deserialize: DeSerializer;
  public filePath: string;
  public remainCount = 0;

  static usingFiles = new Set<string>();

  constructor(options: Options) {
    super();
    if (DiskQueue.usingFiles.has(options.filePath)) {
      throw new Error("this file has been used by another queue");
    }
    this.fd = fs.openSync(options.filePath, "w+");
    this.liner = new lineByLine(this.fd);
    this.serialize = options.serializer ?? JSON.stringify;
    this.deserialize = options.deserializer ?? JSON.parse;
    this.filePath = options.filePath;
    DiskQueue.usingFiles.add(this.filePath);
    process.once("exit", () => {
      fs.writeFileSync(options.filePath, "");
    });
  }

  protected appendBatchLinesSync(lines: string[]) {
    do {
      if (!this.holding) {
        fs.writeSync(this.fd, lines.join("\n") + "\n");
        fs.fdatasyncSync(this.fd);
        this.remainCount += lines.length;
      }
    } while (this.holding);
  }

  protected nextLine(): string | undefined {
    const maybeLine = this.liner.next();
    return maybeLine === endSymobl ? undefined : maybeLine.toString("utf-8");
  }

  public push(...items: unknown[]) {
    this.appendBatchLinesSync(items.map((item) => this.serialize(item)));
  }

  public shift(): any {
    const line = this.nextLine();
    if (line === undefined) {
      return undefined;
    }
    this.remainCount--;
    if (this.remainCount === 0) {
      this.emit("drain");
      this.clearFile();
    }
    const result = this.deserialize(line);
    return result;
  }

  private clearFile() {
    this.holding = true;
    fs.fdatasyncSync(this.fd);
    fs.closeSync(this.fd);
    this.fd = fs.openSync(this.filePath, "w+");
    this.liner = new lineByLine(this.fd);
    this.holding = false;
  }

  public reset() {
    this.clearFile();
    this.remainCount = 0;
    this.emit("reset");
  }
  public close() {
    DiskQueue.usingFiles.delete(this.filePath);
    this.liner.close();
  }
}
