import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { logDone, logDryRun, logFail } from "../src/lib/logger";

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

    test("text format with suggestion", () => {
      logFail("text", "bad name", 0, { code: "INVALID_NAME", suggestion: "use alphanumerics" });
      expect(errorSpy).toHaveBeenCalledWith("fail: bad name (hint: use alphanumerics)");
    });

    test("json format", () => {
      logFail("json", "API error", 2100);
      const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
      expect(parsed).toEqual({
        status: "fail",
        error: "API error",
        ms: 2100,
      });
    });

    test("json format with code and suggestion", () => {
      logFail("json", "bad name", 0, {
        code: "INVALID_NAME",
        suggestion: "use alphanumerics",
      });
      const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
      expect(parsed).toEqual({
        status: "fail",
        error: "bad name",
        ms: 0,
        code: "INVALID_NAME",
        suggestion: "use alphanumerics",
      });
    });
  });

  describe("logDryRun", () => {
    test("text format", () => {
      logDryRun("text", {
        dest: "/abs/01.png",
        model: "gpt-image-2",
        provider: "openai",
        credential: "missing",
        promptChars: 42,
      });
      expect(logSpy).toHaveBeenCalledWith(
        "dryrun: would write /abs/01.png using gpt-image-2 (openai)",
      );
    });

    test("json format", () => {
      logDryRun("json", {
        dest: "/abs/01.png",
        model: "gpt-image-2",
        provider: "openai",
        credential: "local",
        aspectRatio: "1:1",
        promptChars: 42,
      });
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed).toEqual({
        status: "dryrun",
        dest: "/abs/01.png",
        model: "gpt-image-2",
        provider: "openai",
        credential: "local",
        aspectRatio: "1:1",
        promptChars: 42,
      });
    });
  });
});
