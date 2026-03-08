import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { logDone, logFail } from "../src/lib/logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe("logDone", () => {
    test("text format", () => {
      logDone("text", "./images/01.png", 3800);
      expect(logSpy).toHaveBeenCalledWith("done: ./images/01.png (3.8s)");
    });

    test("json format", () => {
      logDone("json", "./images/01.png", 3800);
      const output = logSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed).toEqual({
        status: "done",
        image: "./images/01.png",
        ms: 3800,
      });
    });
  });

  describe("logFail", () => {
    test("text format", () => {
      logFail("text", "API error", 2100);
      expect(errorSpy).toHaveBeenCalledWith("fail: API error");
    });

    test("json format", () => {
      logFail("json", "API error", 2100);
      const output = errorSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed).toEqual({
        status: "fail",
        error: "API error",
        ms: 2100,
      });
    });
  });
});
