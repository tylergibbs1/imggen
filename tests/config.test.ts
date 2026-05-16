import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, stat, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  ConfigError,
  getApiKey,
  getApiKeySource,
  getConfigPath,
  loadConfig,
  saveTheme,
  setApiKey,
  unsetApiKey,
} from "../src/lib/config";

describe("local config", () => {
  let dir: string;
  let previousConfig: string | undefined;
  let previousGeminiKey: string | undefined;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "imggen-config-"));
    previousConfig = process.env.IMGGEN_CONFIG;
    previousGeminiKey = process.env.GEMINI_API_KEY;
    process.env.IMGGEN_CONFIG = join(dir, "config.json");
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(async () => {
    if (previousConfig === undefined) {
      delete process.env.IMGGEN_CONFIG;
    } else {
      process.env.IMGGEN_CONFIG = previousConfig;
    }
    if (previousGeminiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previousGeminiKey;
    }
    await rm(dir, { recursive: true, force: true });
  });

  test("returns empty config when the file does not exist", async () => {
    expect(await loadConfig()).toEqual({});
  });

  test("saves API keys with owner-only file permissions", async () => {
    await setApiKey("gemini", "local-key");

    expect(await getApiKey("gemini", "GEMINI_API_KEY")).toBe("local-key");
    expect((await loadConfig()).apiKeys?.gemini).toBe("local-key");
    expect((await stat(getConfigPath())).mode & 0o777).toBe(0o600);
  });

  test("environment API keys take precedence over local keys", async () => {
    await setApiKey("gemini", "local-key");
    process.env.GEMINI_API_KEY = "env-key";

    expect(await getApiKey("gemini", "GEMINI_API_KEY")).toBe("env-key");
    expect(await getApiKeySource("gemini", "GEMINI_API_KEY")).toBe("env");
  });

  test("reports local and missing API key sources", async () => {
    await setApiKey("gemini", "local-key");

    expect(await getApiKeySource("gemini", "GEMINI_API_KEY")).toBe("local");
    expect(await getApiKeySource("openai", "OPENAI_API_KEY")).toBe("missing");
  });

  test("unsets local API keys", async () => {
    await setApiKey("gemini", "local-key");

    expect(await unsetApiKey("gemini")).toBe(true);
    expect(await getApiKey("gemini", "GEMINI_API_KEY")).toBeUndefined();
  });

  test("saves local themes", async () => {
    await saveTheme({
      name: "studio",
      description: "Studio lighting",
      prefix: "Use controlled studio lighting.\n\n",
    });

    expect((await loadConfig()).themes?.studio).toEqual({
      name: "studio",
      description: "Studio lighting",
      prefix: "Use controlled studio lighting.\n\n",
    });
  });

  test("throws a typed error for invalid JSON", async () => {
    await writeFile(getConfigPath(), "{bad json");

    await expect(loadConfig()).rejects.toThrow(ConfigError);
    await expect(loadConfig()).rejects.toThrow(/invalid JSON/);
  });
});
