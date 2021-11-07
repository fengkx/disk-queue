import { DiskFastq } from "../packages/disk-fastq/src/index";
import fastq from "fastq";
import { genFilePath, noop } from "./const";

describe("Disk Fastq", () => {
  test("can init", () => {
    const queue = new DiskFastq(noop, 4, { filePath: genFilePath() });
    expect(queue).toBeDefined();
    queue.close();
  });

  test("can push data and run worker", (done) => {
    const fn = jest.fn();
    const doNothing: fastq.worker<any> = (data, cb) => {
      fn();
      setTimeout(() => {
        cb(undefined, data);
      }, 100);
    };
    const queue = new DiskFastq(doNothing, 4, { filePath: genFilePath() });
    const cnt = 100;
    for (let i = 1; i <= 100; i++) {
      queue.push({ data: i });
    }
    const onDrain = jest.fn();
    queue.close();

    queue.on("drain", () => {
      expect(queue.length).toBe(0);
      expect(fn).toHaveBeenCalledTimes(cnt);
      onDrain();
      expect(onDrain).toHaveBeenCalled();
      done();
    });
  });
});
