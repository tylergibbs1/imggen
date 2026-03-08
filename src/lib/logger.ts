import type { OutputFormat } from "./types";

export function logDone(
  format: OutputFormat,
  imagePath: string,
  elapsedMs: number,
): void {
  if (format === "json") {
    console.log(
      JSON.stringify({ status: "done", image: imagePath, ms: elapsedMs }),
    );
  } else {
    const seconds = (elapsedMs / 1000).toFixed(1);
    console.log(`done: ${imagePath} (${seconds}s)`);
  }
}

export function logFail(
  format: OutputFormat,
  message: string,
  elapsedMs: number,
): void {
  if (format === "json") {
    console.error(
      JSON.stringify({ status: "fail", error: message, ms: elapsedMs }),
    );
  } else {
    console.error(`fail: ${message}`);
  }
}
