# 🛡️ Pace

**Learns how long airdrop farmers and bounty hunters usually go between payouts — then protects enough cash so they don’t go broke before the next claim.**

Pace uses Walrus Memory to track real drought intervals, daily burn, and bill clusters. When money arrives, it locks a runway reserve and only sweeps true surplus. The blockchain stays invisible.

---

## Live Demo

| Link | Description |
|------|-------------|
| **Live App** | [Add your Vercel URL] |
| **Demo Video** | [Add YouTube link] |
| **Repo** | [github.com/Reelmemory/Pace](https://github.com/Reelmemory/Pace) |

---

## Judge’s 60-Second Path

1. Click **Replay 60-Day Airdrop Cycle** (writes 10 Walrus memories).
2. Watch the learned profile update: drought days, daily burn, confidence.
3. Click **Log Bounty Payout**.
4. See how much is locked for runway vs swept as surplus.
5. Check the **Memory Effect** panel — it shows how much more was protected compared to a cold start.
6. Toggle **Inspector** to view the Walrus memory proof.

---

## The Problem

Airdrop farmers and bounty hunters get paid in irregular bursts. A normal budgeting app assumes steady income. Most crypto tools force you to manage wallets and gas yourself.

Result: people overspend during long gaps or panic-sell right before the next claim.

---

## How It Works

### Learned variables (from Walrus Memory)
- **D_drought** — 80th-percentile gap between external payouts
- **B_daily** — learned daily burn rate
- **L_upcoming** — recurring bills inside the drought window
- **FloorBuffer** — minimum untouchable checking balance

### Core equationRunway Reserve = (D_drought × B_daily) + L_upcoming + FloorBuffer
True Surplus   = max(0, Available Cash − Runway Reserve)text### What changes with memory
Without memory, Pace uses generic defaults and often sweeps too much.  
With 10+ Walrus memories, it protects more for the actual drought pattern you’ve lived through.

---

## Network

| Component | Details |
|-----------|---------|
| Memory | Walrus Memory (`@mysten-incubation/memwal`) on Mainnet |
| Chain data | Tatum Sui RPC |
| Frontend | Next.js 16 + React 19 + Tailwind |

---

## Local Development

```bash
git clone https://github.com/Reelmemory/Pace.git
cd Pace
npm install
npm run devLimitations
Focused on airdrop / bounty-style irregular income
Live Mainnet writes need Walrus credentials
Sweep is simulated in the demo (full Sui settlement can be added)
Built With
Next.js 16, React 19, Tailwind
Walrus Memory
Tatum Sui RPCs

License
MIT