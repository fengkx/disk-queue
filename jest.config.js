module.exports = {
  roots: ["<rootDir>/tests"],
  testTimeout: 30 * 1000,
  collectCoverageFrom: [
    "<rootDir>/packages/**/src/*.ts",
    "!<rootDir>/packages/disk-queue/src/n-readlines.ts",
  ],
  transform: {
    "^.+\\.(t|j)sx?$": "esbuild-jest",
  },
};
