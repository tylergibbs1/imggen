# imggen

An agent-first CLI for generating images from text prompts using Google Gemini.

Built for AI agents (Claude Code, Cursor, Codex, etc.) to generate images as part of automated workflows. One command, structured JSON output, stdin support, zero config beyond an API key.

## Install

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/tylergibbs1/imggen.git
cd imggen
bun install
```

Set your Gemini API key:

```bash
export GEMINI_API_KEY=your_key_here
```

## Usage

```bash
# From a prompt argument
imggen "A clean dark infographic about cloud architecture"

# From stdin (agent-friendly)
echo "A minimalist logo for a developer tool" | imggen

# With options
imggen "Your prompt" -d ./output -n logo -a 16:9 -s vercel
```

### JSON output for agents

```bash
$ imggen "A dark infographic" -f json
{"status":"done","image":"./images/01.png","ms":8200}
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
  -a, --aspect-ratio <ratio> Aspect ratio (default: 1:1)
  -m, --model <model>        Gemini model (default: gemini-3-pro-image-preview)
  -f, --format <fmt>         Output format: text or json (default: text)
```

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
