import { describe, test, expect } from "bun:test";
import { resolve } from "path";
import { validateName, validateDir, ValidationError } from "../src/lib/validate";

describe("validateName", () => {
  test("accepts alphanumeric", () => {
    expect(() => validateName("logo01")).not.toThrow();
    expect(() => validateName("hero-banner_v2.final")).not.toThrow();
  });

  test("rejects empty", () => {
    expect(() => validateName("")).toThrow(ValidationError);
  });

  test("rejects path separators", () => {
    expect(() => validateName("sub/name")).toThrow(/path separators/);
    expect(() => validateName("sub\\name")).toThrow(/path separators/);
  });

  test("rejects traversal", () => {
    expect(() => validateName("..")).toThrow(/cannot be/);
    expect(() => validateName(".")).toThrow(/cannot be/);
  });

  test("rejects control chars", () => {
    expect(() => validateName("na\x00me")).toThrow(/control characters/);
    expect(() => validateName("na\nme")).toThrow(/control characters/);
  });

  test("rejects leading punctuation", () => {
    expect(() => validateName(".hidden")).toThrow(/invalid characters/);
    expect(() => validateName("-starts")).toThrow(/invalid characters/);
  });
});

describe("validateDir", () => {
  test("resolves to absolute", () => {
    expect(validateDir("./out")).toBe(resolve("./out"));
  });

  test("rejects empty", () => {
    expect(() => validateDir("")).toThrow(ValidationError);
  });

  test("rejects null byte", () => {
    expect(() => validateDir("out\x00/sub")).toThrow(/null byte/);
  });
});
