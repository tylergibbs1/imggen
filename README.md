# imggen

An agent-first CLI for generating images from text prompts. Supports Google Gemini and OpenAI GPT Image.

Built for AI agents (Claude Code, Cursor, Codex, etc.) to generate images as part of automated workflows. One command, structured JSON output, stdin support, zero config beyond an env or saved local API key.

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

Or save a key locally so agents can reuse it across runs:

```bash
imggen key set gemini your_key_here
imggen key set openai your_key_here
imggen key list
```

Environment variables still win over saved keys. Local config is stored at `~/.config/imggen/config.json` with `0600` permissions by default. Set `IMGGEN_CONFIG=/path/to/config.json` to override that path. Use `imggen config path` to print the active path.

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

# Save and reuse a local theme
imggen theme save studio "Editorial studio lighting, crisp product photography, neutral backdrop"
imggen "A premium desk setup" -s studio
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
{"status":"dryrun","dest":"/abs/01.png","model":"gpt-image-2-2026-04-21","provider":"openai","credential":"local","aspectRatio":"3840x2160","promptChars":17}
```

### Schema

Every version ships a self-describing JSON schema — flags, providers, styles, error codes, and output shapes. Agents should read this before invoking unfamiliar versions.

```bash
imggen schema | jq '.providers'
```

### Agent workflow

For repeatable agent runs:

```bash
# 1. Inspect the live command surface
imggen schema

# 2. Confirm credentials without exposing secret values
imggen key list -f json

# 3. Inspect the active local config path/status
imggen config inspect -f json

# 4. Save a reusable theme when prompt styling should persist across runs
imggen theme save studio "Editorial studio lighting, crisp product photography" -f json

# 5. Validate before spending provider credits
imggen "A premium desk setup" -s studio --dry-run -f json

# 6. Generate and parse .image from stdout
imggen "A premium desk setup" -s studio -f json
```

Use `IMGGEN_CONFIG=/path/to/config.json` for isolated automation or tests that should not touch the user's default config.

## Styles and local themes

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

You can also save your own reusable local themes:

```bash
imggen theme save studio "Editorial studio lighting, crisp product photography, neutral backdrop"
echo "Flat vector editorial style, bold simple shapes" | imggen theme save editorial --description "Flat editorial vector"
imggen theme list
imggen theme show studio
imggen theme delete studio
```

Saved themes live in the local config file and are available through the same `-s, --style` flag as built-in styles.

## Local API keys

Use `imggen key` when an agent needs a persistent local credential instead of asking for a key on every run:

```bash
imggen key set gemini your_key_here
echo "your_openai_key" | imggen key set openai
imggen key list
imggen key unset gemini
```

Keys are not printed back by `imggen key list`; it only reports whether each provider has an env or local key configured.

## Local config

```bash
imggen config path
imggen config inspect -f json
```

`config inspect` reports the active path, whether the config file exists, key presence booleans, and saved theme names. It never prints API key values. If the config file contains invalid JSON, commands return a normal failure payload with code `INVALID_CONFIG`.

## Options

```
imggen <prompt> [options]

Options:
  -d, --dir <path>           Output directory (default: ./images)
  -n, --name <name>          File name without extension (default: auto-increment)
  -s, --style <name>         Built-in style or saved local theme
  -a, --aspect-ratio <ratio> Aspect ratio (default: 1:1). OpenAI also accepts WxH (e.g. 2048x2048)
  -m, --model <model>        Model id. gpt-image-* routes to OpenAI, anything else to Gemini
                             (default: gemini-3-pro-image-preview)
  -f, --format <fmt>         Output format: text or json (default: text on TTY, json when piped)
      --dry-run              Validate inputs and report planned output, no API call

Subcommands:
  schema                     Print machine-readable JSON schema (commands, flags, providers)
  config path                Print the active local config file path
  config inspect             Show local config status without exposing secrets
  theme list                 List built-in styles and saved local themes
  theme save <name> <text>   Save a local theme prompt prefix
  theme show <name>          Show a built-in style or saved theme
  theme delete <name>        Delete a saved local theme
  key set <provider> <key>   Save a Gemini or OpenAI API key locally
  key list                   Show which providers have env/local keys configured
  key unset <provider>       Delete a saved local API key
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
