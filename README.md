# imggen

An agent-first CLI for generating images from text prompts. Supports Google Gemini and OpenAI GPT Image.

Built for AI agents (Claude Code, Cursor, Codex, etc.) to generate images as part of automated workflows. One command, structured JSON output, stdin support, zero config beyond an API key.

## Install

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/tylergibbs1/imggen.git
cd imggen
bun install
```

Set an API key for the provider you plan to use:

```bash
export GEMINI_API_KEY=your_key_here  # for Gemini models (default)
export OPENAI_API_KEY=your_key_here  # for gpt-image-* models
```

## Usage

```bash
# From a prompt argument
imggen "A clean dark infographic about cloud architecture"

# From stdin (agent-friendly)
echo "A minimalist logo for a developer tool" | imggen

# With options
imggen "Your prompt" -d ./output -n logo -a 16:9 -s vercel

# Switch provider by model name
imggen "A studio portrait of a mechanical keyboard" -m gpt-image-2-2026-04-21 -a 2048x2048
```

### JSON output for agents

```bash
$ imggen "A dark infographic" -f json
{"status":"done","image":"/abs/path/01.png","ms":8200}
```

`-f json` is the default when stdout isn't a TTY, so piped invocations already get structured output.

### Dry-run

Validates inputs and reports the planned destination without calling a provider or spending API dollars.

```bash
$ imggen "A 4K hero image" -m gpt-image-2-2026-04-21 -a 3840x2160 --dry-run
{"status":"dryrun","dest":"/abs/01.png","model":"gpt-image-2-2026-04-21","provider":"openai","aspectRatio":"3840x2160","promptChars":17}
```

### Schema

Every version ships a self-describing JSON schema — flags, providers, styles, error codes, and output shapes. Agents should read this before invoking unfamiliar versions.

```bash
imggen schema | jq '.providers'
```

## Built-in styles

Skip the prompt engineering. Use `-s` to apply a batteries-included visual style:

```bash
imggen "Cloud architecture diagram" -s engineer
imggen "Product feature highlight" -s apple
imggen "Developer tool dashboard" -s vercel
```

| Style | Description |
|-------|-------------|
| `engineer` | Dark engineering notebook, hand-sketched line art, orange accent |
| `apple` | Clean white keynote, SF Pro typography, blue accent |
| `vercel` | Geist design system, Swiss grid, flat monochrome |

Styles are prepended to your prompt automatically. You can still pass raw prompts without `-s` for full control.

## Options

```
imggen <prompt> [options]

Options:
  -d, --dir <path>           Output directory (default: ./images)
  -n, --name <name>          File name without extension (default: auto-increment)
  -s, --style <name>         Built-in style preset (engineer, apple, vercel)
  -a, --aspect-ratio <ratio> Aspect ratio (default: 1:1). OpenAI also accepts WxH (e.g. 2048x2048)
  -m, --model <model>        Model id. gpt-image-* routes to OpenAI, anything else to Gemini
                             (default: gemini-3-pro-image-preview)
  -f, --format <fmt>         Output format: text or json (default: text on TTY, json when piped)
      --dry-run              Validate inputs and report planned output, no API call

Subcommands:
  schema                     Print machine-readable JSON schema (commands, flags, providers)
```

### Providers

| Provider | Example model | Env var |
|----------|---------------|---------|
| Gemini | `gemini-3-pro-image-preview` (default) | `GEMINI_API_KEY` |
| OpenAI | `gpt-image-2-2026-04-21`, `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini` | `OPENAI_API_KEY` |

For OpenAI, the `-a` flag accepts common aspect ratios (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `landscape`, `portrait`, `square`, `auto`) or an explicit `WxH` size string like `2048x2048`.

## Why agent-first

- **Structured output** — JSON mode for easy parsing by agents
- **stdin support** — pipe prompts directly from agent workflows
- **Auto-increment naming** — agents don't need to track file numbers
- **Predictable exit codes** — 0 success, 1 generation failure, 2 input error
- **No interactivity** — no prompts, no confirmations, no TUI. Just input and output
- **Parallel generation** — run multiple `imggen` commands concurrently

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Generation failure |
| 2 | Input error (missing prompt, bad arguments) |

## License

MIT
