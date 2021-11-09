import { DiskFastq } from "../packages/disk-fastq/src/index";
import fastq from "fastq";
import { genFilePath, noop } from "./const";

describe("Disk Fastq", () => {
  test("can init", () => {
    const queue = new DiskFastq(noop, 4, { filePath: genFilePath() });
    expect(queue).toBeDefined();
    queue.close();
    const queue2 = new DiskFastq(
      {},
      noop,
      4,
      { filePath: genFilePath() },
      noop
    );
    expect(queue2).toBeDefined();
    queue2.close();
    const queue3 = new DiskFastq({}, noop, 4, { filePath: genFilePath() });
    expect(queue3).toBeDefined();
    queue3.close();
  });

  test("can push data and run worker", (done) => {
    const fn = jest.fn();
    const cb = jest.fn();
    const doNothing: fastq.worker<any> = (data, cb) => {
      fn();
      setTimeout(() => {
        cb(undefined, data);
      }, 300);
    };
    const queue = new DiskFastq(
      doNothing,
      3,
      { filePath: genFilePath() },
      (_a, _b, arg) => {
        expect(arg).toBeDefined();
        cb();
      }
    );
    const cnt = 30;
    for (let i = 1; i <= cnt; i++) {
      queue.push({ data: i });
    }
    const onDrain = jest.fn();
    queue.close();

    queue.on("drain", () => {
      expect(queue.length).toBe(0);
      expect(fn).toHaveBeenCalledTimes(cnt);
      expect(cb).toHaveBeenCalledTimes(cnt);
      onDrain();
      expect(onDrain).toHaveBeenCalled();
      done();
    });
  });
});
