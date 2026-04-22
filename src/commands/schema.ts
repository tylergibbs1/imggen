import { STYLES } from "../lib/styles";
import { EXIT_SUCCESS } from "../lib/types";

const SCHEMA = {
  name: "imggen",
  description: "Agent-first CLI for text-to-image generation (Gemini + OpenAI)",
  commands: {
    generate: {
      default: true,
      usage: 'imggen "<prompt>" [options]',
      promptSources: ["positional arg", "stdin (when piped)"],
      flags: {
        "-d, --dir": {
          type: "path",
          default: "./images",
          description: "Output directory (auto-created)",
        },
        "-n, --name": {
          type: "string",
          default: "auto-increment (01, 02, ...)",
          description: "Base filename without extension",
          constraints: "alphanumeric + . _ -; must start alphanumeric; max 128 chars",
        },
        "-s, --style": {
          type: "enum",
          values: Object.keys(STYLES),
          description: "Built-in style preset prepended to the prompt",
        },
        "-a, --aspect-ratio": {
          type: "string",
          default: "1:1",
          description:
            "Aspect ratio token. Passed through to Gemini; mapped to a size on OpenAI. OpenAI also accepts an explicit WxH string (e.g. 2048x2048).",
        },
        "-m, --model": {
          type: "string",
          default: "gemini-3-pro-image-preview",
          description:
            'Provider routed by prefix: "gpt-image-*" -> OpenAI, otherwise -> Gemini',
        },
        "-f, --format": {
          type: "enum",
          values: ["text", "json"],
          default: "text on TTY, json on non-TTY",
          description: "Output format",
        },
        "--dry-run": {
          type: "boolean",
          description:
            "Validate inputs and report planned destination without calling any provider API",
        },
      },
    },
    schema: {
      usage: "imggen schema",
      description: "Print this JSON schema and exit",
    },
  },
  providers: {
    gemini: {
      envVar: "GEMINI_API_KEY",
      modelPrefix: "not gpt-image-*",
      exampleModels: ["gemini-3-pro-image-preview"],
      aspectRatio: "passthrough",
    },
    openai: {
      envVar: "OPENAI_API_KEY",
      modelPrefix: "gpt-image-*",
      exampleModels: [
        "gpt-image-2-2026-04-21",
        "gpt-image-2",
        "gpt-image-1.5",
        "gpt-image-1",
        "gpt-image-1-mini",
      ],
      aspectRatioMap: {
        "1:1": "1024x1024",
        "16:9": "1536x1024",
        "9:16": "1024x1536",
        "4:3": "1536x1024",
        "3:4": "1024x1536",
        "3:2": "1536x1024",
        "2:3": "1024x1536",
        landscape: "1536x1024",
        portrait: "1024x1536",
        square: "1024x1024",
        auto: "auto",
      },
      sizeRules: {
        maxEdgePx: 3840,
        edgeMultiple: 16,
        maxRatio: "3:1",
        minPixels: 655360,
        maxPixels: 8294400,
      },
    },
  },
  styles: Object.values(STYLES).map(({ name, description }) => ({
    name,
    description,
  })),
  output: {
    stdout: {
      success: { status: "done", image: "<abs-path>", ms: "<int>" },
      dryrun: {
        status: "dryrun",
        dest: "<abs-path>",
        model: "<string>",
        provider: "gemini | openai",
        aspectRatio: "<string>",
        promptChars: "<int>",
        style: "<string?>",
      },
    },
    stderr: {
      fail: {
        status: "fail",
        error: "<message>",
        code: "<error-code>",
        suggestion: "<string?>",
        ms: "<int>",
      },
    },
  },
  exitCodes: {
    "0": "Success",
    "1": "Generation failure (provider error, network, write error)",
    "2": "Input error (missing prompt, bad flag, validation failure)",
  },
  errorCodes: [
    "MISSING_PROMPT",
    "INVALID_NAME",
    "INVALID_DIR",
    "UNKNOWN_STYLE",
    "GENERATION_FAILED",
  ],
};

export function runSchema(): number {
  console.log(JSON.stringify(SCHEMA, null, 2));
  return EXIT_SUCCESS;
}
