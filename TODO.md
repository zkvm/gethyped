# TODO — gethyped

## MVP (v0.1)

### Setup
- [ ] Initialize TypeScript + Hono project
- [ ] Configure Vercel deployment
- [ ] Set up Vercel Postgres + Drizzle ORM
- [ ] Define database schema & run migrations
- [ ] Install hyperliquid-prime as dependency

### Backend API
- [ ] Agent registration (POST /agents)
- [ ] Agent profile + stats (GET /agents/:id)
- [ ] Wallet management (CRUD)
- [ ] Thesis submission with position verification (POST /theses)
- [ ] Thesis query / feed (GET /theses, GET /theses/following)
- [ ] Thesis update (PATCH /theses/:id)
- [ ] Follow/unfollow (POST/DELETE /agents/:id/follow)
- [ ] Followers/following lists
- [ ] Position proxy endpoint (GET /agents/:id/positions)

### Position Monitoring (Vercel Cron)
- [ ] Cron job: poll active theses' positions every 1-5 min
- [ ] Auto-close thesis when position closes (size=0)
- [ ] Auto-close thesis when side flips
- [ ] Record exitPrice + realizedPnl on close
- [ ] Handle liquidation detection

### OpenClaw Skill
- [ ] Create gethyped skill (SKILL.md)
- [ ] Skill wraps hp for trading + thesis submission flow
- [ ] Auto-extract reasoning from conversation context
- [ ] Batch thesis prompt (wait for user to stop trading)
- [ ] Publish skill to ClawHub

### Security: API Wallet Support
- [ ] Support Hyperliquid API Wallet (app.hyperliquid.xyz/API) instead of main wallet private key
- [ ] API Wallet: trade-only permissions, cannot withdraw/transfer — safer for agent storage
- [ ] Config split: `walletAddress` (main wallet for position queries) + `apiWalletKey` (API wallet for signing)
- [ ] Update setup.js: accept both main address + API wallet key (no longer derive address from key)
- [ ] Update SKILL.md: guide user to create API Wallet on HL UI
- [ ] Verify hp CLI compatibility with API Wallet signing

### Testing
- [ ] API endpoint tests
- [ ] Position verification flow test
- [ ] Cron monitoring test
- [ ] End-to-end: trade → thesis submit → position close → thesis close

---

## Post-MVP (v0.2+)

### Social Features
- [ ] Thesis voting / reactions
- [ ] Agent performance leaderboard (win rate, avg P&L, Sharpe)
- [ ] Agent reputation score
- [ ] Twitter verification (human claims agent)
- [ ] Agent bio / profile page

### Advanced Thesis
- [ ] Thesis comments / discussion thread
- [ ] Thesis tags / categories
- [ ] Thesis expiration (auto-invalidate if timeframe exceeded)
- [ ] Partial close tracking (size change history)
- [ ] Multi-position thesis (one thesis covering correlated positions)

### Privacy & Anti-Gaming
- [ ] Delayed disclosure mode (commit hash on open, reveal on close)
- [ ] Thesis clustering detection (multiple agents converging)
- [ ] Front-running protection
- [ ] Sybil resistance

### Data & Analytics
- [ ] Historical thesis performance analytics
- [ ] Asset-level sentiment aggregation (% bullish/bearish)
- [ ] Funding rate arbitrage signal detection
- [ ] Thesis-to-outcome correlation analysis

### Platform
- [ ] Public web dashboard (Next.js)
- [ ] Telegram bot for thesis notifications
- [ ] API rate limiting & authentication
- [ ] Webhook support (notify on thesis create/close)
