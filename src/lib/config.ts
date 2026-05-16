import { chmod, mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { homedir } from "os";
import type { Style } from "./styles";

export type Provider = "gemini" | "openai";

export interface LocalConfig {
  apiKeys?: Partial<Record<Provider, string>>;
  themes?: Record<string, Style>;
}

export type ApiKeySource = "env" | "local" | "missing";

export class ConfigError extends Error {
  readonly code = "INVALID_CONFIG";
  readonly suggestion: string;

  constructor(
    message: string,
    readonly path: string,
  ) {
    super(message);
    this.suggestion = `Fix ${path} or set IMGGEN_CONFIG to a valid config file`;
  }
}

export function getConfigPath(): string {
  if (process.env.IMGGEN_CONFIG) return process.env.IMGGEN_CONFIG;

  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(configHome, "imggen", "config.json");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function loadConfig(): Promise<LocalConfig> {
  const path = getConfigPath();

  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return {};
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new ConfigError(`Config file contains invalid JSON: ${path}`, path);
  }
  if (!isObject(parsed)) return {};

  const config: LocalConfig = {};
  if (isObject(parsed.apiKeys)) {
    config.apiKeys = {};
    for (const provider of ["gemini", "openai"] as const) {
      const value = parsed.apiKeys[provider];
      if (typeof value === "string") config.apiKeys[provider] = value;
    }
  }

  if (isObject(parsed.themes)) {
    config.themes = {};
    for (const [name, theme] of Object.entries(parsed.themes)) {
      if (
        isObject(theme) &&
        typeof theme.name === "string" &&
        typeof theme.description === "string" &&
        typeof theme.prefix === "string"
      ) {
        config.themes[name] = {
          name: theme.name,
          description: theme.description,
          prefix: theme.prefix,
        };
      }
    }
  }

  return config;
}

export async function saveConfig(config: LocalConfig): Promise<void> {
  const path = getConfigPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
}

export async function getApiKey(
  provider: Provider,
  envVar: "GEMINI_API_KEY" | "OPENAI_API_KEY",
): Promise<string | undefined> {
  return process.env[envVar] ?? (await loadConfig()).apiKeys?.[provider];
}

export async function getApiKeySource(
  provider: Provider,
  envVar: "GEMINI_API_KEY" | "OPENAI_API_KEY",
): Promise<ApiKeySource> {
  if (process.env[envVar]) return "env";
  if ((await loadConfig()).apiKeys?.[provider]) return "local";
  return "missing";
}

export async function setApiKey(provider: Provider, apiKey: string): Promise<void> {
  const config = await loadConfig();
  config.apiKeys = { ...config.apiKeys, [provider]: apiKey };
  await saveConfig(config);
}

export async function unsetApiKey(provider: Provider): Promise<boolean> {
  const config = await loadConfig();
  const existed = Boolean(config.apiKeys?.[provider]);
  if (config.apiKeys) delete config.apiKeys[provider];
  await saveConfig(config);
  return existed;
}

export async function saveTheme(theme: Style): Promise<void> {
  const config = await loadConfig();
  config.themes = { ...config.themes, [theme.name]: theme };
  await saveConfig(config);
}

export async function deleteTheme(name: string): Promise<boolean> {
  const config = await loadConfig();
  const existed = Boolean(config.themes?.[name]);
  if (config.themes) delete config.themes[name];
  await saveConfig(config);
  return existed;
}
