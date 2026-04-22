import { resolve } from "path";

export class ValidationError extends Error {
  readonly code: string;
  readonly suggestion?: string;

  constructor(code: string, message: string, suggestion?: string) {
    super(message);
    this.code = code;
    this.suggestion = suggestion;
  }
}

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function validateName(name: string): void {
  if (typeof name !== "string" || name.length === 0) {
    throw new ValidationError("INVALID_NAME", "Name must be a non-empty string");
  }
  if (name === "." || name === "..") {
    throw new ValidationError(
      "INVALID_NAME",
      `Name cannot be "${name}"`,
      "Use an alphanumeric identifier",
    );
  }
  if (/[\x00-\x1f\x7f]/.test(name)) {
    throw new ValidationError(
      "INVALID_NAME",
      "Name contains control characters",
      "Use only letters, digits, dot, underscore, and hyphen",
    );
  }
  if (/[/\\]/.test(name)) {
    throw new ValidationError(
      "INVALID_NAME",
      "Name cannot contain path separators (/ or \\)",
      "Pass a directory with --dir and a bare file name with --name",
    );
  }
  if (!NAME_PATTERN.test(name)) {
    throw new ValidationError(
      "INVALID_NAME",
      `Name "${name}" has invalid characters`,
      "Use letters, digits, dot, underscore, or hyphen; start with alphanumeric",
    );
  }
}

export function validateDir(dir: string): string {
  if (typeof dir !== "string" || dir.length === 0) {
    throw new ValidationError("INVALID_DIR", "Directory must be a non-empty string");
  }
  if (/\x00/.test(dir)) {
    throw new ValidationError("INVALID_DIR", "Directory path contains a null byte");
  }
  return resolve(dir);
}
