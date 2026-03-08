import { mkdir, readdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import { generateImage } from "../lib/gemini";
import { logDone, logFail } from "../lib/logger";
import { getStyle } from "../lib/styles";
import type { GenerateOptions } from "../lib/types";
import { EXIT_SUCCESS, EXIT_GENERATION_FAIL, EXIT_INPUT_ERROR } from "../lib/types";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
  };
  return map[mimeType] ?? ".png";
}

async function getNextName(dir: string): Promise<string> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return "01";
  }

  const numbers = entries
    .filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()))
    .map((f) => {
      const match = f.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return String(next).padStart(2, "0");
}

export async function runGenerate(opts: GenerateOptions): Promise<number> {
  const { dir, model, format, aspectRatio } = opts;
  let { prompt } = opts;

  if (!prompt.trim()) {
    logFail(format, "No prompt provided", 0);
    return EXIT_INPUT_ERROR;
  }

  if (opts.style) {
    const style = getStyle(opts.style);
    if (!style) {
      logFail(format, `Unknown style: ${opts.style}. Available: engineer, apple, vercel`, 0);
      return EXIT_INPUT_ERROR;
    }
    prompt = style.prefix + prompt;
  }

  const start = performance.now();

  try {
    await mkdir(dir, { recursive: true });

    const name = opts.name ?? (await getNextName(dir));
    const result = await generateImage(prompt, model, aspectRatio);
    const ext = mimeToExt(result.mimeType);
    const filename = `${name}${ext}`;
    const filePath = join(dir, filename);

    await writeFile(filePath, result.imageData);

    const elapsed = Math.round(performance.now() - start);
    logDone(format, filePath, elapsed);
    return EXIT_SUCCESS;
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    logFail(format, message, elapsed);
    return EXIT_GENERATION_FAIL;
  }
}
