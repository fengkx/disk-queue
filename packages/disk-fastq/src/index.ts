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
  private numInMemory = 0;

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
    while (this.numInMemory < this.concurrency && this.queue.remainCount > 0) {
      const data = this.queue.shift();
      this.fastq.push(data, () => {
        this.numInMemory--;
      });
      this.numInMemory++;
    }
  }

  public push<T = any>(arg: T, done?: fastQueue.done): void {
    if (this.closed) {
      return;
    }
    const doneWithCount: fastQueue.done = (err, result) => {
      this.numInMemory--;
      done?.(err, result);
    };
    if (this.numInMemory < this.concurrency) {
      this.fastq.push(arg as any, doneWithCount);
      this.numInMemory++;
    } else {
      this.queue.push(arg);
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
