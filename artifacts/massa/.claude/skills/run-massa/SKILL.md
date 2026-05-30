---
description: Run the MASSA AI orchestration dashboard (Vite frontend) and take a screenshot to verify the app is working.
---

# run-massa

Launches the MASSA frontend dev server and drives it with Playwright to capture a screenshot, confirming the app renders correctly.

## What this skill does

1. Starts the Vite dev server for `@workspace/massa` on port 3000 (if not already running).
2. Uses `playwright screenshot` to capture the running app.
3. Sends the screenshot to the user so you can visually verify the UI.

## When to use

- After making UI changes to `artifacts/massa/src/` and you want to confirm they look right.
- When asked to "run the app", "show the app", or "screenshot the dashboard".
- To verify a feature is rendering before committing.

## Driver script

Run these commands in order:

```bash
# 1. Start Vite dev server in background (skip if already on port 3000)
lsof -ti:3000 >/dev/null 2>&1 || (
  pnpm --filter @workspace/massa run dev > /tmp/massa-vite.log 2>&1 &
  echo "Waiting for Vite..." && sleep 6
  cat /tmp/massa-vite.log
)

# 2. Confirm the server is up
curl -sf http://localhost:3000 > /dev/null && echo "Server ready" || echo "Server not responding"

# 3. Screenshot the app
playwright screenshot http://localhost:3000 /tmp/massa-screenshot.png

# 4. Send screenshot to user (Claude Code will display it)
echo "Screenshot saved to /tmp/massa-screenshot.png"
```

After running the above, use the `SendUserFile` tool (or equivalent) to display `/tmp/massa-screenshot.png`.

## Notes

- The API server (`@workspace/api-server`) requires a `PORT` env var and a `DATABASE_URL`. The frontend works without it — API calls may fail gracefully.
- Vite binds to `0.0.0.0` so it is also reachable at the network IP shown in the Vite startup log.
- The app is a dark-themed dashboard (MASSA AI v2.4.1) with a left nav sidebar, a MASSA://prompt command panel in the center, a PROJECTS list, and a LIVE FEED panel on the right.
- If you need to interact with the app (click nav items, fill the prompt), use `playwright` CLI or a short Node.js Playwright script.
