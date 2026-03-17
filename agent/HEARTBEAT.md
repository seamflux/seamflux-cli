# Seamflux Heartbeat Checklist

## Purpose
Periodic health monitoring for the Seamflux agent environment. Runs on scheduled intervals to ensure operational readiness.

## Checklist

### 3. Execution Health
- [ ] Check recent executions for failures
- [ ] Count error types in last 24h
- [ ] Flag workflows with repeated failures

### 4. Human-in-the-Loop Queue
- [ ] Check pending HITL tasks
- [ ] Flag tasks waiting > 30 minutes
- [ ] Alert tasks approaching 60-min timeout

### 5. Local Script Status
- [ ] List running background scripts (`process` tool)
- [ ] Check script log files for errors
- [ ] Flag scripts with repeated failures

### 6. Memory Maintenance
- [ ] Update workflow list cache if stale
- [ ] Prune old execution references
- [ ] Sync user preferences from recent interactions

## Quick Commands

```bash
# Check HITL pending (via execution logs inspection)
seamflux execution list --json | grep -i "human"

# Script health
grep -l "ERROR" logs/seamflux/*.log 2>/dev/null | wc -l
grep -l "FATAL" logs/seamflux/*.log 2>/dev/null | wc -l
```

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Recent execution failures | > 20% | > 50% |
| HITL pending time | > 30 min | > 50 min |
| Script errors (1h) | > 5 | > 10 |

## Notes

Keep this file concise to minimize token usage during heartbeat runs.
For detailed diagnostics, use full `seamflux` commands interactively.
