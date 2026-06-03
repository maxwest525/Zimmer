# CLAUDE.md

## Non-negotiable: Never lie about data

Before calling any feature "working" or "done":
- State explicitly whether each data source is **live (API/DB)** or **static/hardcoded**
- If data is static, label it **STATIC DATA** in the response — never present it as functional
- If a UI shows data that isn't wired to a real backend, say so plainly
- Do not use phrases like "it works", "it's functional", or "it's connected" unless the data flow is end-to-end real

Failing loudly is correct. Silently falling back to fake data and calling it done is not acceptable.

## Project rules (from replit.md)

- No fake/mock/placeholder content — software must fail explicitly, not fall back silently
- No emojis
- No code comments unless explicitly requested
