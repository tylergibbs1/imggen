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
          type: "string",
          builtInValues: Object.keys(STYLES),
          description: "Built-in style or saved local theme prepended to the prompt",
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
    config: {
      usage: "imggen config <path|inspect>",
      description: "Inspect local config without exposing secrets",
      commands: {
        path: {
          usage: "imggen config path [-f json]",
          description: "Print the active local config file path",
        },
        inspect: {
          usage: "imggen config inspect [-f json]",
          description:
            "Show config path, file existence, key presence booleans, and saved theme names",
        },
      },
    },
    theme: {
      usage: "imggen theme <list|save|show|delete>",
      description: "Manage saved local theme prompt prefixes",
      commands: {
        list: {
          usage: "imggen theme list [-f json]",
          description: "List built-in styles and saved local themes",
        },
        save: {
          usage: 'imggen theme save <name> "<prompt prefix>" [--description <text>]',
          stdin: "If prompt prefix is omitted, reads it from stdin",
          description: "Save a reusable local theme",
        },
        show: {
          usage: "imggen theme show <name> [-f json]",
          description: "Show a built-in style or saved local theme",
        },
        delete: {
          usage: "imggen theme delete <name> [-f json]",
          description: "Delete a saved local theme. Built-in styles cannot be deleted",
        },
      },
    },
    key: {
      usage: "imggen key <set|list|unset>",
      description: "Manage saved local provider API keys. Environment variables take precedence",
      commands: {
        set: {
          usage: "imggen key set <gemini|openai> <api-key>",
          stdin: "If api-key is omitted, reads it from stdin",
          description: "Save a provider API key locally without printing it back",
        },
        list: {
          usage: "imggen key list [-f json]",
          description: "Show whether each provider has env/local keys configured",
        },
        unset: {
          usage: "imggen key unset <gemini|openai> [-f json]",
          description: "Delete a saved local provider API key",
        },
      },
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
  localConfig: {
    envVar: "IMGGEN_CONFIG",
    defaultPath: "~/.config/imggen/config.json",
    permissions: "0600",
    stores: ["saved themes", "local provider API keys"],
    keyPrecedence: ["GEMINI_API_KEY / OPENAI_API_KEY", "local config"],
  },
  output: {
    stdout: {
      success: { status: "done", image: "<abs-path>", ms: "<int>" },
      dryrun: {
        status: "dryrun",
        dest: "<abs-path>",
        model: "<string>",
        provider: "gemini | openai",
        credential: "env | local | missing",
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
    "INVALID_PROVIDER",
    "INVALID_API_KEY",
    "INVALID_CONFIG",
    "UNKNOWN_STYLE",
    "UNKNOWN_THEME",
    "MISSING_THEME",
    "MISSING_THEME_PROMPT",
    "BUILTIN_THEME",
    "UNKNOWN_COMMAND",
    "GENERATION_FAILED",
  ],
};

export function runSchema(): number {
  console.log(JSON.stringify(SCHEMA, null, 2));
  return EXIT_SUCCESS;
}
