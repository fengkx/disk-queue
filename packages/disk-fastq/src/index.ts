import fastQueue from "fastq";
import { DiskQueue, Options } from "disk-queue";
import { EventEmitter } from "stream";

type TCallback<T, R> = (
  err: Error | null,
  result: R | undefined,
  task: T
) => void;
export class DiskFastq<C, T = any, R = any> extends EventEmitter {
  queue: DiskQueue;
  fastq: fastQueue.queue<T, R>;
  concurrency: number;
  diskQueueOptions: Options;
  isSaturated = false;
  private jobCallback: (
    err: Error | null,
    result: R | undefined,
    task: T
  ) => void;
  private closed = false;
  private numInMemory = 0;

  constructor(
    worker: fastQueue.worker<C, R>,
    concurrency: number,
    diskQueueOptions: Options,
    callback?: TCallback<T, R>
  );
  constructor(
    context: C,
    worker: fastQueue.worker<C, R>,
    concurrency: number,
    diskQueueOptions: Options,
    callback?: TCallback<T, R>
  );

  constructor(...args: any[]) {
    super();
    let context: any = null;
    let worker: fastQueue.worker<C, R>;
    let concurrency: number;
    let diskQueueOptions: Options;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let callback: typeof this.jobCallback = () => {};
    if (args.length === 3) {
      [worker, concurrency, diskQueueOptions] = args;
    } else if (args.length === 4) {
      if (typeof args[args.length - 1] !== "function") {
        [context, worker, concurrency, diskQueueOptions] = args;
      } else {
        [worker, concurrency, diskQueueOptions, callback] = args;
      }
    } else {
      [context, worker, concurrency, diskQueueOptions, callback] = args;
    }
    const fastq = fastQueue<C, any>(context, worker, concurrency);
    const queue = new DiskQueue(diskQueueOptions);
    this.queue = queue;
    this.fastq = fastq;
    this.concurrency = concurrency;
    this.diskQueueOptions = diskQueueOptions;
    this.jobCallback = (err, result, task) => {
      this.numInMemory--;
      callback(err, result, task);
    };
    this.jobCallback.bind(this);

    this.fastq.drain = this.onFastqDrain.bind(this);
    this.fastq.saturated = () => {
      this.isSaturated = true;
    };
  }

  private addDiskTaskToMemory() {
    while (this.numInMemory < this.concurrency && this.queue.remainCount > 0) {
      const data = this.queue.shift();
      this.fastq.push(data, (err, result) => {
        this.jobCallback(err, result, data);
        this.addDiskTaskToMemory();
      });
      this.numInMemory++;
    }
  }

  private onFastqDrain() {
    if (this.closed) {
      if (this.queue.remainCount === 0) {
        this.queue.close();
        this.emit("drain");
      }
    }
    this.isSaturated = false;
    this.addDiskTaskToMemory();
  }

  public push(arg: T): void {
    if (this.closed) {
      return;
    }

    if (this.numInMemory < this.concurrency && this.queue.remainCount <= 0) {
      this.fastq.push(arg, (err, result) => {
        this.jobCallback(err, result, arg);
        this.addDiskTaskToMemory();
      });
      this.numInMemory++;
    } else {
      this.addDiskTaskToMemory();
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
