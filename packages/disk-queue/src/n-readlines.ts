/**
 * Modified from https://github.com/nacholibre/node-readlines/blob/3da9b57e439916801d4715d0b5150e7871deef78/readlines.js
 *
 * 1. typescript
 * 2. always try to readChunk on next call
 * 3. return const symobl when no next
 * The MIT License (MIT)

 * Copyright (c) 2013 Liucw
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
import * as fs from "fs";

export const endSymobl = Symbol("END");
interface Options {
  readChunk?: number | undefined;
  newLineCharacter?: string | undefined;
}

export default class LineByLine {
  eofReached: boolean;
  linesCache: Buffer[];
  fdPosition: number;
  options: {
    readChunk: number;
    newLineCharacter: number;
  };

  fd: number | null;
  newLineCharacter: number;
  retryMark: boolean;
  constructor(file: fs.PathLike | number, options: Options = {}) {
    this.eofReached = false;
    this.linesCache = [];
    this.fdPosition = 0;
    this.retryMark = false;

    this.options = {
      readChunk: options.readChunk ?? 1024,
      newLineCharacter: options.newLineCharacter?.charCodeAt(0) ?? 0x0a,
    };

    if (typeof file === "number") {
      this.fd = file;
    } else {
      this.fd = fs.openSync(file, "r");
    }

    this.newLineCharacter = this.options.newLineCharacter;

    this.reset();
  }

  _searchInBuffer(buffer: Buffer, hexNeedle: number) {
    let found = -1;

    for (let i = 0; i <= buffer.length; i++) {
      const b_byte = buffer[i];
      if (b_byte === hexNeedle) {
        found = i;
        break;
      }
    }

    return found;
  }

  reset() {
    this.eofReached = false;
    this.linesCache = [];
    this.fdPosition = 0;
  }

  close() {
    if (this.fd !== null && this.fd !== undefined) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
  }

  _extractLines(buffer: Buffer) {
    let line;
    const lines = [];
    let bufferPosition = 0;

    let lastNewLineBufferPosition = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const bufferPositionValue = buffer[bufferPosition++];

      if (bufferPositionValue === this.newLineCharacter) {
        line = buffer.slice(lastNewLineBufferPosition, bufferPosition);
        lines.push(line);
        lastNewLineBufferPosition = bufferPosition;
      } else if (bufferPositionValue === undefined) {
        break;
      }
    }

    const leftovers = buffer.slice(lastNewLineBufferPosition, bufferPosition);
    if (leftovers.length) {
      lines.push(leftovers);
    }

    return lines;
  }

  _readChunk(lineLeftovers: Buffer | undefined) {
    let totalBytesRead = 0;

    let bytesRead;
    const buffers = [];
    do {
      const readBuffer = Buffer.alloc(this.options.readChunk);

      bytesRead = fs.readSync(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.fd!,
        readBuffer,
        0,
        this.options.readChunk,
        this.fdPosition
      );
      totalBytesRead = totalBytesRead + bytesRead;

      this.fdPosition = this.fdPosition + bytesRead;

      buffers.push(readBuffer);
    } while (
      bytesRead &&
      this._searchInBuffer(
        buffers[buffers.length - 1],
        this.options.newLineCharacter
      ) === -1
    );

    let bufferData = Buffer.concat(buffers);

    if (bytesRead < this.options.readChunk) {
      bufferData = bufferData.slice(0, totalBytesRead);
    }

    if (totalBytesRead) {
      this.linesCache = this._extractLines(bufferData);

      if (lineLeftovers != null) {
        this.linesCache[0] = Buffer.concat([lineLeftovers, this.linesCache[0]]);
      }
    }

    return totalBytesRead;
  }

  next() {
    if (!this.fd) return endSymobl;

    let line: Buffer | typeof endSymobl = endSymobl;

    let bytesRead;

    if (this.linesCache.length === 0) {
      bytesRead = this._readChunk(undefined);
    }

    if (this.linesCache.length > 0) {
      line = this.linesCache.shift() as Buffer;

      const lastLineCharacter = line[line.length - 1];

      if (lastLineCharacter !== this.newLineCharacter) {
        bytesRead = this._readChunk(line);

        if (bytesRead) {
          line = this.linesCache.shift() ?? endSymobl;
        }
      }
    }

    if (line !== endSymobl && line[line.length - 1] === this.newLineCharacter) {
      line = line.slice(0, line.length - 1);
    }

    return line;
  }
}
