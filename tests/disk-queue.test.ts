/* eslint-env jest */
import { readFileSync } from "fs";
import path from "path";
import { DiskQueue } from "../packages/disk-queue/src/index";
import { genFilePath } from "./const";

const filePath = genFilePath();
const queue = new DiskQueue({
  filePath,
});

beforeEach(() => {
  queue.reset();
});
afterEach(() => {
  queue.reset();
});

describe("Disk Queue", () => {
  test("can init", () => {
    expect(queue).toBeDefined();
    expect(queue.remainCount).toBe(0);
  });

  test("can push and shift", () => {
    queue.push({ data: 1 });
    expect(queue.remainCount).toBe(1);
    queue.push({ data: 2 });
    expect(queue.remainCount).toBe(2);
    queue.push(...[{ data: 3 }, { data: 4 }]);
    expect(queue.remainCount).toBe(4);

    let r = queue.shift();
    expect(r).toBeDefined();
    expect(r.data).toBe(1);
    expect(queue.remainCount).toBe(3);

    r = queue.shift();
    expect(r).toBeDefined();
    expect(r.data).toBe(2);
    expect(queue.remainCount).toBe(2);

    r = queue.shift();
    expect(r).toBeDefined();
    expect(r.data).toBe(3);
    expect(queue.remainCount).toBe(1);

    r = queue.shift();
    expect(r).toBeDefined();
    expect(r.data).toBe(4);
    expect(queue.remainCount).toBe(0);

    // file should be clear when remainCount is zero
    const txt = readFileSync(filePath, { encoding: "utf-8" });
    expect(txt).toHaveLength(0);
    expect(queue.shift()).toBe(undefined);
    expect(queue.shift()).toBe(undefined);
    expect(queue.remainCount).toBe(0);
  });

  test("random test", () => {
    const filePath = genFilePath();
    const queue = new DiskQueue({
      filePath,
    });
    const data = JSON.parse(
      readFileSync(path.join(__dirname, "./fixtures/small-random-data.json"), {
        encoding: "utf-8",
      })
    );
    let totalCount = 0;
    let remainCount = 0;
    for (let i = 0; i < data.length; i++) {
      const push = Math.random() > 0.4;
      if (push) {
        queue.push(data[i]);
        remainCount++;
        totalCount++;
      } else {
        if (remainCount <= 0) {
          const r = queue.shift();
          expect(r).toBe(undefined);
        } else {
          expect(queue.remainCount).toBe(remainCount);
          const r = queue.shift();
          expect(r).toBeDefined();
          expect(r).toStrictEqual(data[r.index]);
          remainCount--;
        }
      }
    }
  });
});
