# Seamflux Boot Checklist

## Purpose
Executed on gateway restart when internal hooks are enabled. Performs lightweight initialization.

## Startup Sequence

### 1. Environment Check
- [ ] Verify `seamflux` CLI available
- [ ] Check API connectivity
- [ ] Validate local workspace directories exist

### 2. Workspace Setup
```bash
# Ensure log directory exists
mkdir -p logs/seamflux

# Verify script directory
ls -la ~/.seamflux/scripts/ 2>/dev/null || echo "No scripts downloaded yet"
```

### 3. Quick Sync
- [ ] Refresh workflow list cache (if using local memory)
- [ ] Check for interrupted executions from previous session
- [ ] Resume monitoring of long-running local scripts

### 4. Status Report
Send brief status message:
> "Seamflux Agent ready. [N] workflows cached, [M] local scripts available. Use `workflow list` to see your automations."

## Quick Recovery

If credentials expired during downtime:
- Notify user: "Please run `seamflux config init` locally to refresh API credentials."
- Do not block startup; defer API-dependent operations until user updates config.

## Notes

- Keep execution fast; use `message` tool for async notifications
- Do not start long-running operations here; use HEARTBEAT for periodic tasks
- Ensure idempotency - safe to run multiple times
