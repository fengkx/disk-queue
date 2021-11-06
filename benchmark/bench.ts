import fastq from "fastq";
import { readFileSync } from "fs";
import path from "path";
import { DiskFastq } from "../packages/disk-fastq/src";
import { genFilePath } from "../tests/const";

const FASTQ_LABEL = "fastq";
const DISK_FASTQ_LABEL = "diskFastq";
const TASK_SIZE = 6000;
const CONCURRENCY = 300;
const TASK_DELAY = 5 * 1000;
const delayWork: fastq.worker<any> = (_data, cb) => {
  setTimeout(() => {
    cb(null);
  }, TASK_DELAY);
};

console.time(FASTQ_LABEL);
const q = fastq(delayWork, CONCURRENCY);
for (let i = 1; i <= TASK_SIZE; i++) {
  q.push({ data: i });
}
console.log(process.memoryUsage());
q.drain = () => {
  console.timeEnd(FASTQ_LABEL);
  console.time(DISK_FASTQ_LABEL);
  const queue = new DiskFastq(delayWork, CONCURRENCY, {
    filePath: genFilePath(),
  });
  for (let i = 1; i <= TASK_SIZE; i++) {
    queue.push({ data: i });
  }
  global.gc?.();
  console.log(process.memoryUsage());
  queue.close();
  queue.once("drain", () => {
    console.timeEnd(DISK_FASTQ_LABEL);
  });
};
