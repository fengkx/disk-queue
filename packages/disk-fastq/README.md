# disk-fastq

> fastq wrapper persisted queue on disk to save some memory

## Install

```
$ npm install disk-fastq
# or
$ pnpm add disk-fastq
```

## Usage

Like [fastq](https://npmjs.com/package/fastq)
recive (context, worker, concurrency) but and addional options passed to [disk-queue](https://npmjs.com/package/disk-queue)

```js
import { DiskFastq } from "disk-fastq";
const worker = (_data, cb) => {
  setTimeout(() => {
    cb(null);
  }, 1000);
};

const queue = new DiskFastq(
  worker,
  4,
  {
    filePath: genFilePath(),
  },
  (err, result) => {
    if (err) {
      console.err(err);
    } else {
      console.log(result);
    }
  }
);
for (let i = 1; i <= TASK_SIZE; i++) {
  queue.push({ data: i });
}
```

## API

### DiskFastq

class of disk queue recive a options object

Type:

```
constructor(worker: fastQueue.worker<C, R>, concurrency: number, diskQueueOptions: Options, callback?: fastQueue.done);
    constructor(context: C, worker: fastQueue.worker<C, R>, concurrency: number, diskQueueOptions: Options, callback?: fastQueue.done);
```

work like [fastq](https://npmjs.com/package/fastq) callback API

#### diskQueueOptions

See [disk-queue](https://npmjs.com/package/fastq)

#### cb

callback called when task is done. **Note that there is no callback paramter in push method**

### push(data)

Add a task at the end of the queue.

### close()

Mark queue as closed, no longer able to add new task.

### reset()

Reset queue to empty length, discard all jobs

### length

Get the length of task in queue

### queue#drain

Event triggered when queue is close and become empty

```js
queue.close();
queue.on("drain", () => {
  // all jobs is finish
});
```
