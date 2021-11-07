import fastQueue from "fastq";
import { DiskQueue, Options } from "disk-queue";
import { EventEmitter } from "stream";

export class DiskFastq<C, R = any> extends EventEmitter {
  queue: DiskQueue;
  fastq: fastQueue.queue<C, R>;
  concurrency: number;
  diskQueueOptions: Options;
  isSaturated = false;
  private closed = false;

  constructor(
    worker: fastQueue.worker<C, R>,
    concurrency: number,
    diskQueueOptions: Options
  );
  constructor(
    context: C,
    worker: fastQueue.worker<C, R>,
    concurrency: number,
    diskQueueOptions: Options
  );
  constructor(...args: any[]) {
    super();
    let context: any;
    let worker: fastQueue.worker<C, R>;
    let concurrency: number;
    let diskQueueOptions: Options;
    if (args.length === 3) {
      context = null;
      [worker, concurrency, diskQueueOptions] = args;
    } else {
      [context, worker, concurrency, diskQueueOptions] = args;
    }
    const fastq = fastQueue<C, any>(context, worker, concurrency);
    const queue = new DiskQueue(diskQueueOptions);
    this.queue = queue;
    this.fastq = fastq;
    this.concurrency = concurrency;
    this.diskQueueOptions = diskQueueOptions;

    this.fastq.drain = this.onFastqDrain.bind(this);
    this.fastq.saturated = () => {
      this.isSaturated = true;
    };
  }

  private onFastqDrain() {
    if (this.closed) {
      if (this.queue.remainCount === 0) {
        this.queue.close();
        this.emit("drain");
      }
    }
    this.isSaturated = false;
    let remainCount = this.concurrency;
    let data;
    while (remainCount > 0 && (data = this.queue.shift())) {
      this.fastq.push(data);
      remainCount--;
    }
  }

  public push<T = any>(arg: T, done?: fastQueue.done): void {
    if (this.closed) {
      return;
    }
    if (this.isSaturated || !this.fastq.idle()) {
      this.queue.push(arg);
    } else {
      this.fastq.push(arg as any, done);
    }
  }

  public close() {
    this.closed = true;
  }

  public reset() {
    this.fastq.kill();
    this.fastq.drain = this.onFastqDrain.bind(this);
    this.queue.reset();
  }

  public get length() {
    return this.fastq.length() + this.queue.remainCount;
  }
}
