---
name: imggen
description: Generate images from text prompts via Gemini or OpenAI GPT Image, from the command line.
---

# Using imggen

`imggen` is an agent-first CLI that writes a single image file per invocation and emits a structured JSON result line. It wraps two providers behind one binary.

## Rules

- **Always pass `-f json`** when parsing output programmatically. On non-TTY stdout the default is already JSON, but setting it explicitly is safer.
- **Always run `imggen schema` first** on an unfamiliar version to get the current flag list, provider list, style list, error codes, and output shapes. Do not infer these from memory.
- **Prefer `--dry-run` before every mutating call** whose parameters were constructed at runtime. Dry-run validates inputs and returns the planned destination path without spending API dollars.
- **Route by model name.** Any model starting with `gpt-image-` goes to OpenAI (needs `OPENAI_API_KEY`); everything else goes to Gemini (needs `GEMINI_API_KEY`). Set the right key for the chosen model.
- **One style at a time.** `-s/--style` replaces, not stacks. For layered styling, combine manually in the prompt.
- **Do not construct file paths by hand.** Pass `-d <dir>` for the directory and `-n <name>` for the base name. Read the absolute destination back from the JSON result (`.image` for success, `.dest` for dry-run).

## Filename constraints

`-n <name>` accepts only `[A-Za-z0-9._-]`, must start alphanumeric, max 128 chars. No slashes, no control chars, no `..`. Omit `-n` to get an auto-incrementing two-digit name (`01`, `02`, …).

## Aspect ratio / size

- Gemini accepts standard ratio tokens (`1:1`, `16:9`, …); they pass through to the API.
- OpenAI maps ratio tokens to a fixed list of sizes (`1024x1024`, `1536x1024`, `1024x1536`). It also accepts an explicit `WxH` string (`2048x2048`, `3840x2160`, …) for larger outputs. Constraints: max edge 3840, both edges multiples of 16, ratio ≤ 3:1, pixels between 655,360 and 8,294,400.

## Cost awareness

GPT Image 2 at `2048x2048` with `quality=high` is ~$0.21 per image (≈20× a `1024x1024` low-quality Gemini call). For exploratory loops, stick to `-a 1:1` and a small/default model. Use `--dry-run` to preview before iterating.

## Output contract

Success (stdout):
```json
{"status":"done","image":"/abs/path/01.png","ms":8200}
```

Dry-run (stdout):
```json
{"status":"dryrun","dest":"/abs/path/01.png","model":"gpt-image-2-2026-04-21","provider":"openai","aspectRatio":"1:1","promptChars":312}
```

Failure (stderr):
```json
{"status":"fail","error":"OPENAI_API_KEY environment variable is not set","code":"GENERATION_FAILED","ms":3}
```

Exit codes: `0` success, `1` generation failure, `2` input error.

## Recipes

Generate with a style:
```bash
imggen "cloud architecture diagram" -s engineer -d ./out
```

OpenAI GPT Image 2 at 2K:
```bash
imggen "studio portrait of a mechanical keyboard" \
  -m gpt-image-2-2026-04-21 -a 2048x2048 -d ./out
```

Dry-run before committing to a big render:
```bash
imggen "$LONG_PROMPT" -m gpt-image-2-2026-04-21 -a 3840x2160 --dry-run
```

Pipe a prompt from another process:
```bash
echo "a minimalist logo" | imggen -s vercel
```

Introspect the CLI:
```bash
imggen schema | jq '.providers.openai.exampleModels'
```
