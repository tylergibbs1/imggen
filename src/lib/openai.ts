import OpenAI from "openai";
import { getApiKey } from "./config";

interface GenerateImageResult {
  imageData: Buffer;
  mimeType: string;
  text?: string;
}

type OpenAISize =
  | "auto"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "2048x2048"
  | "2048x1152"
  | "3840x2160"
  | "2160x3840";

const ASPECT_RATIO_TO_SIZE: Record<string, OpenAISize> = {
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
};

function resolveSize(aspectRatio?: string): OpenAISize {
  if (!aspectRatio) return "auto";
  if (/^\d+x\d+$/.test(aspectRatio)) return aspectRatio as OpenAISize;
  return ASPECT_RATIO_TO_SIZE[aspectRatio.toLowerCase()] ?? "auto";
}

export function isOpenAIModel(model: string): boolean {
  return model.startsWith("gpt-image-");
}

export async function generateImage(
  prompt: string,
  model: string,
  aspectRatio?: string,
): Promise<GenerateImageResult> {
  const apiKey = await getApiKey("openai", "OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OpenAI API key is not set. Set OPENAI_API_KEY or run: imggen key set openai <api-key>");
  }

  const client = new OpenAI({ apiKey });

  const result = await client.images.generate({
    model,
    prompt,
    size: resolveSize(aspectRatio) as any,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI did not return image data");
  }

  return {
    imageData: Buffer.from(b64, "base64"),
    mimeType: "image/png",
  };
}
