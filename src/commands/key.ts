import { getApiKey, getConfigPath, loadConfig, setApiKey, unsetApiKey } from "../lib/config";
import { logFail } from "../lib/logger";
import { readStdin } from "../lib/stdin";
import type { OutputFormat } from "../lib/types";
import { EXIT_INPUT_ERROR, EXIT_SUCCESS } from "../lib/types";

type Provider = "gemini" | "openai";

const PROVIDERS = new Set(["gemini", "openai"]);

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

function isProvider(value: string | undefined): value is Provider {
  return value !== undefined && PROVIDERS.has(value);
}

function print(format: OutputFormat, text: string, payload: Record<string, unknown>): void {
  if (format === "json") {
    console.log(JSON.stringify(payload));
  } else {
    console.log(text);
  }
}

async function readSecret(args: string[]): Promise<string> {
  const value = args.join(" ").trim();
  if (value) return value;
  if (!process.stdin.isTTY) return readStdin();
  return "";
}

export async function runKey(args: string[], defaultFormat: OutputFormat): Promise<number> {
  const format = parseFormat(args, defaultFormat);
  const action = args.shift();
  const path = getConfigPath();

  if (action === "list") {
    const config = await loadConfig();
    const payload = {
      status: "ok",
      path,
      keys: {
        gemini: {
          env: Boolean(process.env.GEMINI_API_KEY),
          local: Boolean(config.apiKeys?.gemini),
          resolved: Boolean(await getApiKey("gemini", "GEMINI_API_KEY")),
        },
        openai: {
          env: Boolean(process.env.OPENAI_API_KEY),
          local: Boolean(config.apiKeys?.openai),
          resolved: Boolean(await getApiKey("openai", "OPENAI_API_KEY")),
        },
      },
    };
    print(format, `keys: config ${path}`, payload);
    return EXIT_SUCCESS;
  }

  if (action === "set") {
    const provider = args.shift();
    if (!isProvider(provider)) {
      logFail(format, "Provider must be gemini or openai", 0, {
        code: "INVALID_PROVIDER",
      });
      return EXIT_INPUT_ERROR;
    }

    const apiKey = await readSecret(args);
    if (!apiKey || /[\x00-\x1f\x7f]/.test(apiKey)) {
      logFail(format, "API key must be a non-empty single-line string", 0, {
        code: "INVALID_API_KEY",
      });
      return EXIT_INPUT_ERROR;
    }

    await setApiKey(provider, apiKey);
    print(format, `saved ${provider} key to ${path}`, {
      status: "saved",
      provider,
      path,
    });
    return EXIT_SUCCESS;
  }

  if (action === "unset") {
    const provider = args.shift();
    if (!isProvider(provider)) {
      logFail(format, "Provider must be gemini or openai", 0, {
        code: "INVALID_PROVIDER",
      });
      return EXIT_INPUT_ERROR;
    }

    const existed = await unsetApiKey(provider);
    print(format, `${existed ? "removed" : "no local"} ${provider} key in ${path}`, {
      status: existed ? "deleted" : "missing",
      provider,
      path,
    });
    return EXIT_SUCCESS;
  }

  logFail(format, "Unknown key command", 0, {
    code: "UNKNOWN_COMMAND",
    suggestion: "Use: imggen key set <gemini|openai> <api-key>, imggen key list, or imggen key unset <provider>",
  });
  return EXIT_INPUT_ERROR;
}
