import type { OutputFormat } from "./types";

export interface FailOptions {
  code?: string;
  suggestion?: string;
}

export interface DryRunInfo {
  dest: string;
  model: string;
  provider: "gemini" | "openai";
  aspectRatio?: string;
  promptChars: number;
  style?: string;
}

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
  opts: FailOptions = {},
): void {
  if (format === "json") {
    const payload: Record<string, unknown> = {
      status: "fail",
      error: message,
      ms: elapsedMs,
    };
    if (opts.code) payload.code = opts.code;
    if (opts.suggestion) payload.suggestion = opts.suggestion;
    console.error(JSON.stringify(payload));
  } else {
    const hint = opts.suggestion ? ` (hint: ${opts.suggestion})` : "";
    console.error(`fail: ${message}${hint}`);
  }
}

export function logDryRun(format: OutputFormat, info: DryRunInfo): void {
  if (format === "json") {
    console.log(JSON.stringify({ status: "dryrun", ...info }));
  } else {
    console.log(
      `dryrun: would write ${info.dest} using ${info.model} (${info.provider})`,
    );
  }
}
