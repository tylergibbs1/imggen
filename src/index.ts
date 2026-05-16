#!/usr/bin/env bun

import { runConfig } from "./commands/config";
import { runGenerate } from "./commands/generate";
import { runKey } from "./commands/key";
import { runSchema } from "./commands/schema";
import { runTheme } from "./commands/theme";
import { ConfigError } from "./lib/config";
import { logFail } from "./lib/logger";
import { readStdin } from "./lib/stdin";
import type { OutputFormat } from "./lib/types";
import { EXIT_INPUT_ERROR } from "./lib/types";

const HELP = `imggen — generate images from text prompts using Google Gemini or OpenAI GPT Image

Usage:
  imggen <prompt> [options]
  echo "prompt" | imggen [options]
  imggen schema
  imggen config path

Options:
  -d, --dir <path>           Output directory (default: ./images)
  -n, --name <name>          File name without extension (default: auto-increment)
  -s, --style <name>         Built-in style or saved local theme
  -a, --aspect-ratio <ratio> Aspect ratio (default: 1:1). OpenAI also accepts WxH (e.g. 2048x2048)
  -m, --model <model>        Model id. gpt-image-* routes to OpenAI, anything else to Gemini
                             (default: gemini-3-pro-image-preview)
  -f, --format <fmt>         Output format: text or json (default: text on TTY, json when piped)
      --dry-run              Validate and report planned output without calling a provider
  -h, --help                 Show this help

Subcommands:
  schema                     Print machine-readable JSON schema (commands, flags, providers)
  config path                Print the active local config file path
  config inspect             Show local config status without exposing secrets
  theme list                 List built-in styles and saved local themes
  theme save <name> <text>   Save a local theme prompt prefix
  theme show <name>          Show a built-in style or saved theme
  theme delete <name>        Delete a saved local theme
  key set <provider> <key>   Save a Gemini or OpenAI API key locally
  key list                   Show which providers have env/local keys configured
  key unset <provider>       Delete a saved local API key

Styles:
  engineer   Dark engineering notebook, white line art, orange (#F97316) accent
  apple      Clean white keynote, SF Pro typography, blue (#0071E3) accent
  vercel     Dark developer aesthetic, sharp lines, monochrome with glow

Environment:
  GEMINI_API_KEY   Google Gemini API key (required for Gemini models)
  OPENAI_API_KEY   OpenAI API key (required for gpt-image-* models)
  IMGGEN_CONFIG    Optional config path override (default: ~/.config/imggen/config.json)

Exit codes:
  0  Success
  1  Generation failure
  2  Input error (missing prompt, bad arguments)`;

function parseFlag(args: string[], short: string, long: string): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === short || args[i] === long) {
      const val = args[i + 1];
      args.splice(i, 2);
      return val;
    }
  }
  return undefined;
}

function hasFlag(args: string[], short: string | null, long: string): boolean {
  const idx = args.findIndex((a) => a === long || (short !== null && a === short));
  if (idx >= 0) {
    args.splice(idx, 1);
    return true;
  }
  return false;
}

function peekFormat(args: string[], defaultFormat: OutputFormat): OutputFormat {
  const idx = args.findIndex((arg) => arg === "-f" || arg === "--format");
  return (idx >= 0 ? (args[idx + 1] as OutputFormat | undefined) : undefined) ?? defaultFormat;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  if (args.length === 0 || hasFlag(args, "-h", "--help")) {
    console.log(HELP);
    return 0;
  }

  if (args[0] === "schema" && args.length === 1) {
    return runSchema();
  }

  const defaultFormat: OutputFormat = process.stdout.isTTY ? "text" : "json";
  const errorFormat = peekFormat(args, defaultFormat);

  try {
    return await run(args, defaultFormat);
  } catch (err) {
    if (err instanceof ConfigError) {
      logFail(errorFormat, err.message, 0, {
        code: err.code,
        suggestion: err.suggestion,
      });
      return EXIT_INPUT_ERROR;
    }
    throw err;
  }
}

async function run(args: string[], defaultFormat: OutputFormat): Promise<number> {
  if (args[0] === "theme") {
    return runTheme(args.slice(1), defaultFormat);
  }

  if (args[0] === "key") {
    return runKey(args.slice(1), defaultFormat);
  }

  if (args[0] === "config") {
    return runConfig(args.slice(1), defaultFormat);
  }

  const dir = parseFlag(args, "-d", "--dir") ?? "./images";
  const name = parseFlag(args, "-n", "--name");
  const style = parseFlag(args, "-s", "--style");
  const aspectRatio = parseFlag(args, "-a", "--aspect-ratio") ?? "1:1";
  const model = parseFlag(args, "-m", "--model") ?? "gemini-3-pro-image-preview";
  const dryRun = hasFlag(args, null, "--dry-run");
  const formatFlag = parseFlag(args, "-f", "--format");
  const format: OutputFormat = (formatFlag as OutputFormat | undefined) ?? defaultFormat;

  let prompt = args.join(" ");
  if (!prompt && !process.stdin.isTTY) {
    prompt = await readStdin();
  }

  if (!prompt) {
    console.error("Error: No prompt provided. Pass as argument or pipe via stdin.");
    console.error('Usage: imggen "Your prompt here"');
    return EXIT_INPUT_ERROR;
  }

  return runGenerate({ prompt, dir, name, style, model, format, aspectRatio, dryRun });
}

main().then((code) => process.exit(code));
