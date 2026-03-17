# Seamflux Boot Checklist

On startup:

- Verify the `seamflux` CLI is available.
- Check whether credentials appear configured.
- Ensure local log directories exist.
- Report a brief ready or degraded state.

If auth is missing or expired:

- Tell the user to run `seamflux config init` locally.
- Do not block startup.

Do not:

- start long-running tasks
- perform expensive sync work
- duplicate recurring checks from `HEARTBEAT.md`
