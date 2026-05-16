import { existsSync } from "fs";
import { getConfigPath, loadConfig } from "../lib/config";
import { logFail } from "../lib/logger";
import type { OutputFormat } from "../lib/types";
import { EXIT_INPUT_ERROR, EXIT_SUCCESS } from "../lib/types";

function parseFlag(args: string[], short: string | null, long: string): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === long || (short !== null && args[i] === short)) {
      const val = args[i + 1];
      args.splice(i, 2);
      return val;
    }
  }
  return undefined;
}

function parseFormat(args: string[], defaultFormat: OutputFormat): OutputFormat {
  return (parseFlag(args, "-f", "--format") as OutputFormat | undefined) ?? defaultFormat;
}

function print(format: OutputFormat, text: string, payload: Record<string, unknown>): void {
  if (format === "json") {
    console.log(JSON.stringify(payload));
  } else {
    console.log(text);
  }
}

export async function runConfig(
  args: string[],
  defaultFormat: OutputFormat,
): Promise<number> {
  const format = parseFormat(args, defaultFormat);
  const action = args.shift();
  const path = getConfigPath();

  if (action === "path") {
    print(format, path, { status: "ok", path });
    return EXIT_SUCCESS;
  }

  if (action === "inspect") {
    const config = await loadConfig();
    print(format, `config: ${path}`, {
      status: "ok",
      path,
      exists: existsSync(path),
      keys: {
        gemini: {
          env: Boolean(process.env.GEMINI_API_KEY),
          local: Boolean(config.apiKeys?.gemini),
        },
        openai: {
          env: Boolean(process.env.OPENAI_API_KEY),
          local: Boolean(config.apiKeys?.openai),
        },
      },
      themes: Object.keys(config.themes ?? {}).sort(),
    });
    return EXIT_SUCCESS;
  }

  logFail(format, "Unknown config command", 0, {
    code: "UNKNOWN_COMMAND",
    suggestion: "Use: imggen config path or imggen config inspect",
  });
  return EXIT_INPUT_ERROR;
}
