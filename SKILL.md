---
name: imggen
description: Generate images from text prompts via Gemini or OpenAI GPT Image, from the command line. Use this when agents need image generation, saved local themes, or persistent local provider API keys.
---

# Using imggen

`imggen` is an agent-first CLI that writes a single image file per invocation and emits a structured JSON result line. It wraps two providers behind one binary and can persist local themes/API keys in `~/.config/imggen/config.json`.

## Rules

- **Always pass `-f json`** when parsing output programmatically. On non-TTY stdout the default is already JSON, but setting it explicitly is safer.
- **Always run `imggen schema` first** on an unfamiliar version to get the current flag list, provider list, style list, error codes, and output shapes. Do not infer these from memory.
- **Prefer `--dry-run` before every mutating call** whose parameters were constructed at runtime. Dry-run validates inputs and returns the planned destination path without spending API dollars.
- **Route by model name.** Any model starting with `gpt-image-` goes to OpenAI; everything else goes to Gemini. Provider keys resolve from env first (`OPENAI_API_KEY` / `GEMINI_API_KEY`), then local config.
- **Use local keys for repeated agent runs.** Save them with `imggen key set <gemini|openai> <api-key>` or pipe the key on stdin. `imggen key list -f json` reports presence only; it never prints the key.
- **Use `imggen config inspect -f json` for config diagnostics.** It reports the active path, file existence, key presence booleans, and saved theme names without exposing secrets.
- **One style/theme at a time.** `-s/--style` accepts built-in styles and saved local themes. It replaces, not stacks. For layered styling, combine manually in the prompt or save a combined theme.
- **Do not construct file paths by hand.** Pass `-d <dir>` for the directory and `-n <name>` for the base name. Read the absolute destination back from the JSON result (`.image` for success, `.dest` for dry-run).
- **Use `IMGGEN_CONFIG` for isolated runs/tests.** Point it at a temp config when testing key/theme commands so you do not alter the user's real saved config.

## Local config

Default path: `~/.config/imggen/config.json`. Override with `IMGGEN_CONFIG=/path/to/config.json`. The file stores:

- `apiKeys.gemini` and `apiKeys.openai`
- saved `themes`

The file is written with `0600` permissions. Environment variables take precedence over local keys.

Inspect config without exposing secrets:
```bash
imggen config path -f json
imggen config inspect -f json
```

If the config file has invalid JSON, commands fail with `code: "INVALID_CONFIG"` and a suggestion to fix the file or set `IMGGEN_CONFIG`.

## Keys

Save a key:
```bash
imggen key set gemini "$GEMINI_API_KEY" -f json
echo "$OPENAI_API_KEY" | imggen key set openai -f json
```

Check configured providers:
```bash
imggen key list -f json
```

Delete a local key:
```bash
imggen key unset gemini -f json
```

Never expect `key list` to return secret values. It returns booleans for `env`, `local`, and `resolved`.

## Themes

Save a reusable theme prefix:
```bash
imggen theme save studio "Editorial studio lighting, crisp product photography" -f json
```

Pipe longer theme text:
```bash
cat theme.txt | imggen theme save editorial --description "Flat editorial vector" -f json
```

List, inspect, or delete:
```bash
imggen theme list -f json
imggen theme show studio -f json
imggen theme delete studio -f json
```

Use saved themes through the same generation flag:
```bash
imggen "premium desk setup" -s studio --dry-run -f json
```

Theme names use the same validation as `--name`: alphanumeric start, then letters/digits/dot/underscore/hyphen; no slashes, control chars, or `..`. Built-in styles cannot be overwritten or deleted.

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
{"status":"dryrun","dest":"/abs/path/01.png","model":"gpt-image-2-2026-04-21","provider":"openai","credential":"local","aspectRatio":"1:1","promptChars":312}
```

Failure (stderr):
```json
{"status":"fail","error":"OpenAI API key is not set. Set OPENAI_API_KEY or run: imggen key set openai <api-key>","code":"GENERATION_FAILED","ms":3}
```

Exit codes: `0` success, `1` generation failure, `2` input error.

## Recipes

Generate with a style:
```bash
imggen "cloud architecture diagram" -s engineer -d ./out
```

Save and use a local theme:
```bash
imggen theme save studio "Editorial studio lighting, crisp product photography" -f json
imggen "premium desk setup" -s studio -d ./out -f json
```

Save a local provider key:
```bash
imggen key set gemini "$GEMINI_API_KEY" -f json
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
