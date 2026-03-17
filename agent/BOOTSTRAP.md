# Seamflux Bootstrap Ritual

One-time setup for a new Seamflux agent workspace.

## Required Setup

1. Install the Seamflux CLI:
   `npm install -g @seamflux/cli`
2. Verify the CLI is available:
   `which seamflux` on Mac or Linux, `where seamflux` on Windows
3. Configure credentials locally:
   `seamflux config init`
4. Verify configuration:
   `seamflux config show`
5. Test connectivity:
   `seamflux workflow list`

Run credential setup in a local terminal, not through chat.

## Optional Add-ons

Install extra quant tooling only if needed:

```bash
pip install quantpipe
pip install chartpipe
```

These tools power the optional external skills:

- `skills/quantpipe/SKILL.md` for signals, backtesting, scanning, and paper trading
- `skills/chartpipe/SKILL.md` for charting, indicators, and backtest visualization

Then verify:

```bash
where quantpipe
where chartpipe
```

## After Bootstrap

- Use `USER.md` for stable user preferences.
- Use `MEMORY.md` or dated memory notes for durable context.
- Use `TOOLS.md` and `skills/seamflux/SKILL.md` for Seamflux command details.
- Use the external QuantPipe and ChartPipe skills when quant analysis or visualization is requested.

Delete this file after bootstrap is complete.
