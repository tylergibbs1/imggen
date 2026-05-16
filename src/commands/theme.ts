import { deleteTheme, getConfigPath, loadConfig, saveTheme } from "../lib/config";
import { logFail } from "../lib/logger";
import { readStdin } from "../lib/stdin";
import { STYLES, getStyleOrTheme } from "../lib/styles";
import type { OutputFormat } from "../lib/types";
import { EXIT_INPUT_ERROR, EXIT_SUCCESS } from "../lib/types";
import { validateName, ValidationError } from "../lib/validate";

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

async function readThemePrefix(args: string[]): Promise<string> {
  const value = args.join(" ").trim();
  if (value) return value;
  if (!process.stdin.isTTY) return readStdin();
  return "";
}

function normalizePrefix(prefix: string): string {
  return `${prefix.trimEnd()}\n\n`;
}

export async function runTheme(args: string[], defaultFormat: OutputFormat): Promise<number> {
  const format = parseFormat(args, defaultFormat);
  const description = parseFlag(args, null, "--description");
  const action = args.shift();
  const path = getConfigPath();

  if (action === "list") {
    const config = await loadConfig();
    const builtIn = Object.values(STYLES).map(({ name, description }) => ({
      name,
      description,
    }));
    const local = Object.values(config.themes ?? {}).map(({ name, description }) => ({
      name,
      description,
    }));
    print(format, `themes: ${[...builtIn, ...local].map((theme) => theme.name).join(", ")}`, {
      status: "ok",
      path,
      builtIn,
      local,
    });
    return EXIT_SUCCESS;
  }

  if (action === "show") {
    const name = args.shift()?.toLowerCase();
    if (!name) {
      logFail(format, "Theme name is required", 0, { code: "MISSING_THEME" });
      return EXIT_INPUT_ERROR;
    }

    const theme = await getStyleOrTheme(name);
    if (!theme) {
      logFail(format, `Unknown theme: ${name}`, 0, {
        code: "UNKNOWN_THEME",
      });
      return EXIT_INPUT_ERROR;
    }

    print(format, `${theme.name}: ${theme.description}`, {
      status: "ok",
      source: STYLES[name] ? "built-in" : "local",
      theme,
    });
    return EXIT_SUCCESS;
  }

  if (action === "save") {
    const rawName = args.shift();
    const name = rawName?.toLowerCase();
    if (!name) {
      logFail(format, "Theme name is required", 0, { code: "MISSING_THEME" });
      return EXIT_INPUT_ERROR;
    }

    try {
      validateName(name);
    } catch (err) {
      if (err instanceof ValidationError) {
        logFail(format, err.message, 0, { code: err.code, suggestion: err.suggestion });
        return EXIT_INPUT_ERROR;
      }
      throw err;
    }

    if (STYLES[name]) {
      logFail(format, `Cannot overwrite built-in theme: ${name}`, 0, {
        code: "BUILTIN_THEME",
      });
      return EXIT_INPUT_ERROR;
    }

    const prefix = await readThemePrefix(args);
    if (!prefix) {
      logFail(format, "Theme prompt text is required", 0, {
        code: "MISSING_THEME_PROMPT",
        suggestion: "Pass text after the theme name or pipe it via stdin",
      });
      return EXIT_INPUT_ERROR;
    }

    const theme = {
      name,
      description: description ?? prefix.replace(/\s+/g, " ").slice(0, 80),
      prefix: normalizePrefix(prefix),
    };
    await saveTheme(theme);
    print(format, `saved theme ${name} to ${path}`, {
      status: "saved",
      theme: name,
      path,
    });
    return EXIT_SUCCESS;
  }

  if (action === "delete") {
    const name = args.shift()?.toLowerCase();
    if (!name) {
      logFail(format, "Theme name is required", 0, { code: "MISSING_THEME" });
      return EXIT_INPUT_ERROR;
    }
    if (STYLES[name]) {
      logFail(format, `Cannot delete built-in theme: ${name}`, 0, {
        code: "BUILTIN_THEME",
      });
      return EXIT_INPUT_ERROR;
    }

    const existed = await deleteTheme(name);
    print(format, `${existed ? "deleted" : "no local"} theme ${name} in ${path}`, {
      status: existed ? "deleted" : "missing",
      theme: name,
      path,
    });
    return EXIT_SUCCESS;
  }

  logFail(format, "Unknown theme command", 0, {
    code: "UNKNOWN_COMMAND",
    suggestion: "Use: imggen theme save <name> <prompt>, imggen theme list, imggen theme show <name>, or imggen theme delete <name>",
  });
  return EXIT_INPUT_ERROR;
}
