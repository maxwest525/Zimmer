export type ChatMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  time: string
}

export const MOCK_CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  'core-engine': [
    { id: 'ce-1', role: 'user', content: 'Start building the core trading engine. I need a strategy runner that listens for signals and submits orders through the broker.', time: '10:02 AM' },
    { id: 'ce-2', role: 'agent', content: 'Got it. I\'ll scaffold the strategy runner with an event-driven architecture. Here\'s the plan:\n\n1. `StrategyRunner` class with signal handler\n2. `BrokerAdapter` interface for exchange abstraction\n3. Order submission pipeline with retry logic\n\nStarting with the core types:', time: '10:02 AM' },
    { id: 'ce-3', role: 'agent', content: '```typescript\nexport interface Signal {\n  symbol: string\n  direction: "long" | "short"\n  confidence: number\n  source: string\n}\n\nexport enum OrderType {\n  MARKET = "MARKET",\n  LIMIT = "LIMIT",\n  STOP = "STOP"\n}\n```\n\nCreated `src/engine/types.ts` with base types.', time: '10:03 AM' },
    { id: 'ce-4', role: 'user', content: 'Good. Make sure the strategy runner validates signals against the risk module before submitting. We can\'t have unvalidated orders going through.', time: '10:05 AM' },
    { id: 'ce-5', role: 'agent', content: 'Absolutely. I\'ve added a `RiskEngine` dependency injection into `StrategyRunner`. Every signal goes through `risk.calculate(signal)` before any order is created.\n\n```typescript\nasync onSignal(signal: Signal) {\n  const sizing = this.risk.calculate(signal)\n  if (sizing.approved && sizing.qty > 0) {\n    await this.broker.submit({\n      side: signal.direction,\n      qty: sizing.qty,\n      type: OrderType.LIMIT,\n    })\n  }\n}\n```\n\nType checks passing — 0 errors, 2 warnings (unused imports I\'ll clean up).', time: '10:06 AM' },
    { id: 'ce-6', role: 'user', content: 'Perfect. What about handling partial fills and order cancellations?', time: '10:08 AM' },
    { id: 'ce-7', role: 'agent', content: 'I\'m implementing an `OrderManager` that tracks order lifecycle states:\n\n- **Pending** → **Partial** → **Filled**\n- **Pending** → **Cancelled**\n- **Partial** → **Cancelled** (with partial fill accounting)\n\nThe manager emits events on state transitions so the strategy runner can react — e.g., re-submit the remaining quantity or adjust position tracking. Writing the state machine now.', time: '10:09 AM' },
  ],
  'risk-module': [
    { id: 'rm-1', role: 'user', content: 'Build the risk module. It needs to enforce max drawdown limits, position sizing, and daily loss caps.', time: '10:15 AM' },
    { id: 'rm-2', role: 'agent', content: 'Setting up the risk engine with three core safety layers:\n\n1. **Per-trade risk**: Max 1% of portfolio per trade\n2. **Daily loss limit**: 3% max daily drawdown\n3. **Position limits**: $15,000 max total exposure\n\nEach layer returns an `approved: boolean` with a reason if rejected.', time: '10:15 AM' },
    { id: 'rm-3', role: 'agent', content: '```typescript\nexport class RiskEngine {\n  calculate(signal: Signal): RiskResult {\n    const checks = [\n      this.checkPerTradeRisk(signal),\n      this.checkDailyLoss(),\n      this.checkPositionLimit(signal),\n      this.checkCorrelation(signal),\n    ]\n    const failed = checks.find(c => !c.approved)\n    return failed || { approved: true, qty: this.optimalSize(signal) }\n  }\n}\n```\n\nCreated `src/engine/risk.ts` — all checks are composable and testable independently.', time: '10:17 AM' },
    { id: 'rm-4', role: 'user', content: 'Add a correlation check too — we shouldn\'t be 80% in correlated assets.', time: '10:20 AM' },
    { id: 'rm-5', role: 'agent', content: 'Done. Added `checkCorrelation()` which calculates portfolio exposure overlap. If correlated assets exceed 60% of total exposure, new positions in the same correlation group are rejected.\n\nI\'m using a simple correlation matrix for now (BTC/ETH = 0.85, SOL/AVAX = 0.72, etc). This can be replaced with live correlation data later.\n\nAll 4 safety rules passing ✓', time: '10:22 AM' },
  ],
  'dashboard-ui': [
    { id: 'du-1', role: 'user', content: 'Design the trading dashboard. I want to see positions, P&L, and a candlestick chart all in one view.', time: '11:00 AM' },
    { id: 'du-2', role: 'agent', content: 'I\'ll build a single-page dashboard with these sections:\n\n- **Top bar**: Portfolio total, daily P&L, win rate, volume\n- **Main area**: Candlestick chart with timeframe selector (1m/5m/1H/4H/1D)\n- **Right panel**: Open positions table + order book depth\n- **Left nav**: Portfolio, Positions, Orders, History, Analytics, Settings\n\nUsing a dark theme with green accents for positive values.', time: '11:01 AM' },
    { id: 'du-3', role: 'user', content: 'Make sure the positions table shows real-time P&L with color coding — green for profit, red for loss.', time: '11:03 AM' },
    { id: 'du-4', role: 'agent', content: 'The positions table now includes:\n\n| Pair | Side | Size | Entry | Current | P&L |\n|------|------|------|-------|---------|-----|\n| BTC/USD | Long | 0.5 | $67,800 | $68,412 | +$306 |\n\nP&L is color-coded: `#2d8a32` for profit, `#b85858` for loss. Values update every 500ms via WebSocket subscription. Added a subtle pulse animation on price changes.', time: '11:05 AM' },
    { id: 'du-5', role: 'user', content: 'Can you add a timeframe selector for the chart?', time: '11:08 AM' },
    { id: 'du-6', role: 'agent', content: 'Added a pill-style timeframe selector above the chart:\n\n`1m` `5m` `1H` `4H` `1D`\n\nActive timeframe gets a highlighted background. Chart data re-fetches on selection change with a smooth transition animation. The `1H` timeframe is selected by default as it gives the best overview for active trading.', time: '11:09 AM' },
  ],
  'alerts': [
    { id: 'al-1', role: 'user', content: 'Set up the alert system. I need notifications for trade executions, price crossings, and risk warnings.', time: '9:30 AM' },
    { id: 'al-2', role: 'agent', content: 'Building the notification pipeline with three channels:\n\n1. **Slack** — all alerts, formatted with blocks\n2. **Email** — critical only (risk warnings, large fills)\n3. **SMS** — emergency only (circuit breaker, system down)\n\nUsing n8n for the workflow orchestration.', time: '9:30 AM' },
    { id: 'al-3', role: 'agent', content: 'Created the n8n workflow with these trigger nodes:\n\n- Price alert webhook → Slack message\n- Order fill webhook → Slack + Email\n- Risk threshold webhook → All channels\n- System health check (every 5min) → SMS if down\n\nEach notification includes contextual data: symbol, price, position size, and timestamp.', time: '9:33 AM' },
    { id: 'al-4', role: 'user', content: 'Add a way to configure which alerts go to which channels. Not everything needs to go to SMS.', time: '9:36 AM' },
    { id: 'al-5', role: 'agent', content: 'Done. Added a routing config:\n\n```json\n{\n  "price_cross": ["slack"],\n  "order_fill": ["slack", "email"],\n  "risk_warning": ["slack", "email", "sms"],\n  "system_down": ["slack", "email", "sms"]\n}\n```\n\nThis is stored in the settings and editable from the dashboard. The n8n workflow reads it dynamically on each trigger. All channels tested and working ✓', time: '9:38 AM' },
  ],
  'backtester': [
    { id: 'bt-1', role: 'user', content: 'Build a backtester so I can run strategies against historical data before going live.', time: '2:00 PM' },
    { id: 'bt-2', role: 'agent', content: 'I\'ll create a simulation engine that replays historical candle data through your strategy:\n\n1. Load OHLCV data for any pair/timeframe\n2. Feed candles through the strategy runner\n3. Track simulated fills, P&L, and metrics\n4. Generate a report with equity curve, drawdown, and win rate\n\nThe backtester will use the same `StrategyRunner` class as production to ensure consistency.', time: '2:01 PM' },
    { id: 'bt-3', role: 'user', content: 'Make sure it accounts for slippage and fees. I don\'t want fake results.', time: '2:04 PM' },
    { id: 'bt-4', role: 'agent', content: 'Good call. Added realistic cost modeling:\n\n- **Slippage**: 0.05% per fill (configurable)\n- **Maker fee**: 0.02%\n- **Taker fee**: 0.04%\n- **Spread simulation**: Based on historical bid/ask when available\n\nThese are applied to every simulated fill. The report shows gross vs net P&L so you can see the impact of costs on strategy performance.', time: '2:06 PM' },
  ],
  'homepage': [
    { id: 'hp-1', role: 'user', content: 'Build the MASSA marketing homepage. It should explain what we do and convert visitors into signups.', time: '11:30 AM' },
    { id: 'hp-2', role: 'agent', content: 'Designing a dark, premium landing page with these sections:\n\n1. **Hero**: Bold headline + animated agent visualization\n2. **How it works**: 3-step flow (Describe → Agents Build → Deploy)\n3. **Features**: Grid of key capabilities\n4. **Social proof**: Metrics and testimonials\n5. **CTA**: Email capture + "Start Building" button\n\nUsing the MASSA brand colors — dark bg with green accents.', time: '11:31 AM' },
    { id: 'hp-3', role: 'user', content: 'The hero needs to feel premium. Can you add some kind of animated background?', time: '11:34 AM' },
    { id: 'hp-4', role: 'agent', content: 'Added a subtle particle network animation to the hero background — floating dots connected by thin lines that drift slowly. It\'s rendered on a canvas layer behind the text.\n\nThe particles use the green accent color (#2d8a32) at low opacity, creating depth without distracting from the copy. Performance is optimized with requestAnimationFrame and reduced particle count on mobile.', time: '11:36 AM' },
    { id: 'hp-5', role: 'user', content: 'Looks great. Add a pricing section too.', time: '11:40 AM' },
    { id: 'hp-6', role: 'agent', content: 'Added a pricing section with three tiers:\n\n- **Starter** ($0): 3 builds/month, 1 agent\n- **Pro** ($29/mo): Unlimited builds, all agents, priority\n- **Team** ($99/mo): Everything + collaboration, custom agents\n\nEach card has a feature list and CTA. The Pro tier is highlighted with a green border and "Most Popular" badge. Pricing cards have a hover lift effect.', time: '11:42 AM' },
  ],
  'api-settings': [
    { id: 'as-1', role: 'user', content: 'Build the API settings page where users can connect their exchange accounts and manage API keys.', time: '1:00 PM' },
    { id: 'as-2', role: 'agent', content: 'Creating a settings page with provider cards for each supported exchange:\n\n- Binance\n- Coinbase Pro\n- Kraken\n- Bybit\n\nEach card shows connection status (connected/disconnected), last sync time, and a manage button. API keys are stored encrypted with AES-256.', time: '1:01 PM' },
    { id: 'as-3', role: 'user', content: 'Add a test connection button so users can verify their keys work before saving.', time: '1:04 PM' },
    { id: 'as-4', role: 'agent', content: 'Added a "Test Connection" button on each provider card. When clicked:\n\n1. Shows a loading spinner\n2. Makes a read-only API call (fetch account balance)\n3. Shows ✓ green checkmark on success, or ✕ red error with message on failure\n\nThe test uses read-only endpoints only — no trade permissions needed for verification. Keys are only saved after a successful test.', time: '1:06 PM' },
  ],
  'crawler': [
    { id: 'cr-1', role: 'user', content: 'Build a web crawler that can scrape product pages and extract pricing data.', time: '3:00 PM' },
    { id: 'cr-2', role: 'agent', content: 'Setting up the crawler with a queue-based architecture:\n\n1. **URL Queue**: Redis-backed priority queue\n2. **Fetcher**: Rate-limited HTTP client with retry logic\n3. **Parser**: CSS selector-based extraction with fallback to LLM parsing\n4. **Storage**: Parsed data → PostgreSQL with dedup\n\nStarting with the fetcher module and robots.txt compliance.', time: '3:01 PM' },
    { id: 'cr-3', role: 'user', content: 'Make sure we respect rate limits and robots.txt. I don\'t want to get blocked.', time: '3:04 PM' },
    { id: 'cr-4', role: 'agent', content: 'Built-in compliance features:\n\n- **robots.txt**: Parsed and cached per domain, all disallowed paths are skipped\n- **Rate limiting**: 1 request/second per domain (configurable)\n- **User-Agent**: Identifies as a legitimate crawler\n- **Retry backoff**: Exponential backoff on 429/503 responses\n- **Crawl delay**: Respects `Crawl-delay` directive\n\nAll requests go through a central rate limiter. If a domain returns 429, we back off for 60 seconds automatically.', time: '3:07 PM' },
  ],
  'scheduler': [
    { id: 'sc-1', role: 'user', content: 'Set up a scheduler that runs the crawler daily and emails me a CSV report.', time: '4:00 PM' },
    { id: 'sc-2', role: 'agent', content: 'Creating an n8n workflow with this schedule:\n\n1. **Daily 6:00 AM UTC**: Trigger crawler run\n2. **On completion**: Query latest data from DB\n3. **Generate CSV**: Format columns (URL, Product, Price, Change, Timestamp)\n4. **Send email**: Attach CSV to configured recipients\n\nThe workflow includes error handling — if the crawler fails, you get an error notification instead.', time: '4:01 PM' },
    { id: 'sc-3', role: 'user', content: 'Can I configure the schedule without touching code?', time: '4:04 PM' },
    { id: 'sc-4', role: 'agent', content: 'Yes — I\'ve exposed the schedule through the settings UI. You can set:\n\n- **Frequency**: Daily, Weekly, or Custom cron expression\n- **Time**: Hour and timezone picker\n- **Recipients**: Comma-separated email list\n- **Filters**: Which products/domains to include in the report\n\nChanges are applied immediately without restarting any service. The n8n workflow reads the config dynamically on each trigger.', time: '4:06 PM' },
  ],
}

const AGENT_RESPONSE_POOLS: Record<string, string[]> = {
  'trading': [
    'I\'ve updated the order handling logic. The new version includes better error recovery for partial fills and network timeouts.',
    'Running the test suite now — all 47 tests passing. The strategy runner is stable under concurrent signal processing.',
    'I noticed the broker adapter wasn\'t handling rate limits properly. Fixed it with an exponential backoff — starts at 100ms, caps at 30 seconds.',
    'Good question. I\'ll add a circuit breaker that halts trading if we hit 5 consecutive errors within 60 seconds. This prevents cascade failures.',
    'The position tracker is now syncing with the exchange every 10 seconds. Any discrepancy triggers an automatic reconciliation.',
    'I\'ve refactored the signal pipeline to use async iterators. This gives us better backpressure handling when signals come in faster than we can process.',
  ],
  'ui': [
    'Updated the chart component to use WebGL rendering for better performance with large datasets. Smooth 60fps even with 10,000 candles.',
    'The responsive layout is ready — dashboard works well on desktop, tablet, and mobile. I used CSS Grid with breakpoints at 768px and 1200px.',
    'Added keyboard shortcuts: `Space` to toggle chart fullscreen, `Esc` to close modals, `1-5` for timeframe switching.',
    'The position table now supports sorting by any column. Click the header to sort ascending, click again for descending.',
    'I\'ve implemented a toast notification system for real-time alerts — they slide in from the top-right and auto-dismiss after 5 seconds.',
    'Added dark/light theme toggle. All colors are defined as CSS custom properties so the switch is instant with no flash.',
  ],
  'scraper': [
    'The parser now handles 3 additional page layouts. I used a template matching approach — each layout has a CSS selector config that gets auto-detected.',
    'Added proxy rotation support. The crawler cycles through a pool of proxies to avoid IP-based rate limiting.',
    'The deduplication logic now uses a composite key (URL + content hash). This prevents storing the same data twice even if the URL changes.',
    'I\'ve added a monitoring dashboard for the crawler. It shows pages/hour, error rate, and queue depth in real-time.',
    'The CSV export now includes delta columns — you can see price changes since the last crawl at a glance.',
    'Added webhook support — you can now push crawl results to any external endpoint in real-time instead of waiting for the daily report.',
  ],
}

export function getAgentResponsePool(buildId: string): string[] {
  if (['core-engine', 'risk-module', 'backtester'].includes(buildId)) return AGENT_RESPONSE_POOLS['trading']
  if (['dashboard-ui', 'homepage', 'api-settings'].includes(buildId)) return AGENT_RESPONSE_POOLS['ui']
  if (['crawler', 'scheduler'].includes(buildId)) return AGENT_RESPONSE_POOLS['scraper']
  return AGENT_RESPONSE_POOLS['trading']
}
