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
        return;
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
    if (this.isSaturated) {
      this.queue.push(arg);
    } else {
      const doneAndAdd: fastQueue.done = (err, result) => {
        if (this.queue.remainCount > 0) {
          this.fastq.push(this.queue.shift());
          if (done) {
            done(err, result);
          }
        }
      };
      this.fastq.push(arg as any, doneAndAdd);
    }
  }

  public close() {
    this.closed = true;
  }
}
