#!/usr/bin/env bun

import { runGenerate } from "./commands/generate";
import type { OutputFormat } from "./lib/types";
import { EXIT_INPUT_ERROR } from "./lib/types";

const HELP = `imggen — generate images from text prompts using Google Gemini

Usage:
  imggen <prompt> [options]
  echo "prompt" | imggen [options]

Options:
  -d, --dir <path>           Output directory (default: ./images)
  -n, --name <name>          File name without extension (default: auto-increment)
  -s, --style <name>         Built-in style preset (engineer, apple, vercel)
  -a, --aspect-ratio <ratio> Aspect ratio (default: 1:1)
  -m, --model <model>        Gemini model to use
  -f, --format <fmt>         Output format: text or json (default: text)
  -h, --help                 Show this help

Styles:
  engineer   Dark engineering notebook, white line art, orange (#F97316) accent
  apple      Clean white keynote, SF Pro typography, blue (#0071E3) accent
  vercel     Dark developer aesthetic, sharp lines, monochrome with glow

Environment:
  GEMINI_API_KEY   Google Gemini API key (required)

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

function hasFlag(args: string[], short: string, long: string): boolean {
  const idx = args.findIndex((a) => a === short || a === long);
  if (idx >= 0) {
    args.splice(idx, 1);
    return true;
  }
  return false;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  if (args.length === 0 || hasFlag(args, "-h", "--help")) {
    console.log(HELP);
    return 0;
  }

  const dir = parseFlag(args, "-d", "--dir") ?? "./images";
  const name = parseFlag(args, "-n", "--name");
  const style = parseFlag(args, "-s", "--style");
  const aspectRatio = parseFlag(args, "-a", "--aspect-ratio") ?? "1:1";
  const model = parseFlag(args, "-m", "--model") ?? "gemini-3-pro-image-preview";
  const format = (parseFlag(args, "-f", "--format") ?? "text") as OutputFormat;

  let prompt = args.join(" ");
  if (!prompt && !process.stdin.isTTY) {
    prompt = await readStdin();
  }

  if (!prompt) {
    console.error("Error: No prompt provided. Pass as argument or pipe via stdin.");
    console.error('Usage: imggen "Your prompt here"');
    return EXIT_INPUT_ERROR;
  }

  return runGenerate({ prompt, dir, name, style, model, format, aspectRatio });
}

main().then((code) => process.exit(code));
