import path from "path";
import { nanoid } from "nanoid";
export const genFilePath = () =>
  path.join(__dirname, `fixtures/queue-${nanoid()}.txt`);

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop: () => void = () => {};
