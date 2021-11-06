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

const queue = new DiskFastq(worker, 4, {
  filePath: genFilePath(),
});
for (let i = 1; i <= TASK_SIZE; i++) {
  queue.push({ data: i });
}
```

## API

### DiskFastq

class of disk queue recive a options object

Type:

```
constructor(worker: fastQueue.worker<C, R>, concurrency: number, diskQueueOptions: Options);
constructor(context: C, worker: fastQueue.worker<C, R>, concurrency: number, diskQueueOptions: Options);
```

work like [fastq](https://npmjs.com/package/fastq) callback API

### push(data, done)

Add a task at the end of the queue. done(err, result) will be called when the task was processed.

### close()

Mark queue as closed, no longer able to add new task.

### queue#drain

event triggered when queue is close and become empty

```js
queue.close();
queue.on("drain", () => {
  // all jobs is finish
});
```
