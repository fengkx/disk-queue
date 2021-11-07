# disk-queue

> A queue persist on filesytem to save memory

## Install

```
$ npm install disk-queue
# or
$ pnpm add disk-queue
```

## Usage

```js
import { DiskQueue } from "disk-queue";
const queue = new DiskQueue({
  filePath,
});
queue.push({ data: 1 });
console.log(queue.remainCount); // 1
queue.push(...[{ data: 2 }, { data: 3 }]);
console.log(queue.remainCount); // 3

console.log(queue.shift()); // {data: 1}
console.log(queue.remainCount); // 2

//...
if (queue.remainCount === 0) {
  console.log(queue.shift()); // undefined
}
```

## API

### DiskQueue(options)

class of disk queue recive a options object

#### options

Type:

```
interface Options {
    filePath: string; // filePath to persist queue
    serializer?: Serializer; // default is JSON.stringify
    deserializer?: DeSerializer; // default is JSON.parse
}
```

### push(data: unknown)

add items to queue work like `Array#shift`

### shift(): unknown|undefined

dequeue a item work like `Array#shift`

### reset()

discard jobs and reset everything

### close()

close internal file descriptor, push after close will throw fd error

### queue.remainCount

The number of remaining item in queue

### queue#drain

event triggered when queue remainCount hit zero

```
queue.on('drain', () => {
    assert(queue.remainCount === 0)
})
```

### queue#reset

event triggered when queue.reset is called
