# 🛡️ Pace

**Adaptive cash-flow pacing for irregular earners — the blockchain stays invisible.**

Pace learns your drought intervals, daily burn, and bill clusters from Walrus Memory, then automatically protects your runway and sweeps only true surplus. Built for freelancers, bounty hunters, and traders on the Walrus x Tatum: Total Recall hackathon.

---

## Live Demo

| Link | Description |
|------|-------------|
| **Live App** | [Add your Vercel URL here] |
| **Demo Video** | [Add YouTube link here] |
| **GitHub** | [github.com/Reelmemory/Pace](https://github.com/Reelmemory/Pace) |

---

## Judge’s 60-Second Path

1. Open the app.
2. Click **Replay 60-Day Feast/Famine Cycle** (seeds 10 Walrus memories).
3. Watch the metrics update: learned drought days, daily burn, and confidence score rise.
4. Click **Log Bounty Payout** — see how much is locked for runway vs swept as surplus.
5. Click **Test Self-Swap** — notice $0 is swept (counterparty filtering).
6. Toggle **Judge Inspector** to see the Walrus + Tatum proof under the hood.
7. Compare the **Before vs After** panel — memory visibly changes the allocation.

---

## The Problem

Irregular earners (bounty hunters, freelancers, traders) face feast-or-famine cash flow. Traditional budgeting tools assume a steady paycheck. Crypto tools usually force users to manage wallets and gas themselves.

Pace solves this by:
- Learning real drought patterns and burn rate over time
- Automatically protecting a runway reserve
- Only sweeping true surplus
- Keeping the blockchain completely invisible to the user

---

## How It Works

### 1. Learns from Walrus Memory
Stores encrypted episodes of payouts, droughts, bill clusters, and user overrides. Each new memory updates the pacing model.

### 2. Feast-or-Famine Router
Runway Reserve = (Learned Drought Days × Daily Burn) + Upcoming Bills + Safety Floor
True Surplus   = max(0, Available Cash − Runway Reserve)
text

### 3. Invisible Blockchain
Users never see wallet prompts or gas. Walrus Memory + Tatum Sui RPCs run in the background.

### 4. Before / After Proof
The dashboard shows side-by-side how a cold-start allocation differs from the learned one — proving memory changes behavior.

---

## Network & Integration

| Component | Details |
|-----------|---------|
| **Memory** | Walrus Memory (`@mysten-incubation/memwal`) on Mainnet |
| **Chain data** | Tatum Sui RPC |
| **Frontend** | Next.js 16 + React 19 + Tailwind |
| **Required memories** | 10+ on Mainnet (seed button handles this) |

---

## Local Development

```bash
git clone https://github.com/Reelmemory/Pace.git
cd Pace
npm install
npm run dev
Open http://localhost:3000

## Limitations

Currently focused on bounty / freelance cash-flow patterns
Live Mainnet memory writes require proper Walrus credentials
Sweep execution is simulated for the demo (full Sui settlement can be added)
Multi-currency support is not yet implemented

Built With

Next.js 16, React 19, Tailwind CSS
Walrus Memory (memwal)
Tatum Sui RPCs
Recharts (visualizations)