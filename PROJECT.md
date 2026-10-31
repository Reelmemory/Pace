# Pace — Master Build Tracker (Walrus x Tatum: Total Recall)

> **One-Line Pitch:** Pace is an adaptive cash-flow pacing and savings app for irregular earners (bounty hunters, freelancers, traders) where the blockchain stays completely invisible while Walrus Memory learns drought intervals, daily burn velocity, and bill clusters across sessions.

---

## 1. Hackathon Target & Prize Strategy
* **Event:** Walrus x Tatum Hackathon: Total Recall
* **Submission Deadline:** November 10, 2026 @ 17:00 UTC
* **Primary Track:** Track 03 — Consumer Finance Apps ($1,000 Pool: $500 1st / $300 2nd / $200 3rd)
* **Stacked Bonus Targets ($500 Each):**
  * [ ] **Best Walrus Memory ($500):** Deepest learning loop where stored memories visibly change product behavior over time.
  * [ ] **Best Use of Agent Payments ($500):** Autonomous `x402` / delegated session sweeps settled on Sui.
  * [ ] **Social Bonus Points:** Publish mandatory devblog and share on X / LinkedIn tagging `@Tatum_io` and `@WalrusFoundation`.

---

## 2. Mandatory Submission Checklist (Gatekeepers)
* [ ] **10+ Mainnet Walrus Memories:** Write at least 10 real encrypted memories to Walrus Mainnet via `@mysten-incubation/memwal`.
* [ ] **MEMWAL_AGENT_ID Recorded:** Save the Delegate Public Key from the Walrus Memory dashboard for the submission form.
* [ ] **Tatum Account ID Recorded:** Save the Tatum Dashboard Account ID for the submission form.
* [ ] **Tatum Sui RPC / Data API Active:** Live onchain balance reads, counterparty checks, and Sui Mainnet checkpoint verification.
* [ ] **Invisible Blockchain UX:** Zero raw hex wallet prompts or gas pop-ups in the primary consumer interface.
* [ ] **Public GitHub Repo + Live Demo URL + Technical Blog Post.**

---

## 3. Core Architecture: The "Feast-or-Famine" Pacing Engine

### A. 3-Bucket Math Router
1. **Learned Variables (Recalled from Walrus Memory):**
   * `D_drought`: 80th-percentile gap (in days) between external payouts.
   * `B_daily`: Learned baseline daily spend velocity ($/day).
   * `L_upcoming`: Upcoming recurring bill clusters inside the drought window.
   * `FloorBuffer`: User's minimum untouchable checking cushion.
2. **Equations:**
   * `RunwayReserve = (D_drought * B_daily) + L_upcoming + FloorBuffer`
   * `TrueSurplusSweep = max(0, Inflow + CurrentCheckingBalance - RunwayReserve)`
   * `WeeklyPaceDrip = RunwayReserve / (D_drought / 7)`

### B. Monotonic Memory Envelope (`pace.v1`)
```json
{
  "schema": "pace.v1",
  "type": "CASHFLOW_PROFILE_STATE",
  "entityKey": "profile:primary",
  "seqVersion": 4,
  "suiCheckpoint": "114920381",
  "timestampIso": "2026-10-31T06:45:00Z",
  "summaryText": "User experienced a 24-day bounty drought; daily burn is $18.50/day with a $65 ISP bill on Day 18.",
  "metrics": {
    "learnedDroughtDays": 24,
    "dailyBurnUsd": 18.5,
    "upcomingLiabilityUsd": 65,
    "safeFloorUsd": 120,
    "confidenceScore": 0.86
  }
}