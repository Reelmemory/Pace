"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Sparkles,
  CalendarClock,
  Wallet,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  Database,
  Layers,
  CheckCircle2,
  Eye,
  EyeOff,
  Zap,
  SlidersHorizontal,
} from "lucide-react";

interface SuiChainAnchor {
  checkpointSequence: string;
  epoch: string;
  timestampMs: string;
  network: string;
  source: string;
  verifiedAtIso: string;
}

interface PaceMemoryMetrics {
  learnedDroughtDays: number;
  dailyBurnUsd: number;
  upcomingLiabilityUsd: number;
  safeFloorUsd: number;
  confidenceScore: number;
  inflowAmountUsd?: number;
  counterpartyTag?: "VERIFIED_PAYOUT" | "SELF_TRANSFER" | "BILL_CLUSTER";
}

interface PaceMemoryEnvelope {
  schema: "pace.v1";
  type: string;
  entityKey: string;
  seqVersion: number;
  timestampIso: string;
  suiAnchor: SuiChainAnchor;
  summaryText: string;
  metrics: PaceMemoryMetrics;
  blobOrJobId?: string;
}

interface AllocationBreakdown {
  inflowAmountUsd: number;
  currentCheckingUsd: number;
  totalAvailableLiquidityUsd: number;
  runwayReserveUsd: number;
  weeklyPaceDripUsd: number;
  dailySafeSpendUsd: number;
  trueSurplusSweepUsd: number;
  droughtDaysCovered: number;
  upcomingBillsReservedUsd: number;
  safeFloorUsd: number;
  sweepAction: "SWEEP_EXECUTED" | "PAUSED_DROUGHT_GUARD" | "IGNORED_SELF_TRANSFER";
  explanation: string;
}

interface PaceApiResponse {
  ok: boolean;
  mode: "mainnet" | "mock";
  namespace: string;
  hasMainnetCreds: boolean;
  agentIdConfigured: boolean;
  totalMemoriesStored: number;
  latestSequenceVersion: number;
  activeMetrics: PaceMemoryMetrics;
  walletSnapshot: {
    address: string;
    totalBalanceSui: number;
    estimatedUsdValue: number;
    anchor: SuiChainAnchor;
  };
  currentAllocation: AllocationBreakdown;
  comparison: {
    coldStartAllocation: AllocationBreakdown;
    learnedAllocation: AllocationBreakdown;
    overSweepPreventedUsd: number;
    extraRunwayDaysSecured: number;
  };
  history: PaceMemoryEnvelope[];
}

export default function PaceDashboardPage() {
  const [data, setData] = useState<PaceApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [showJudgeInspector, setShowJudgeInspector] = useState<boolean>(true);

  // Custom inflow simulator inputs
  const [inflowAmount, setInflowAmount] = useState<number>(950);
  const [inflowSource, setInflowSource] = useState<string>("Gibwork Bounty Payout");
  const [observedGapDays, setObservedGapDays] = useState<number>(24);

  const fetchPaceState = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pace", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch Pace state:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaceState();
  }, [fetchPaceState]);

  async function runAction(
    actionLabel: string,
    payload: Record<string, unknown>
  ) {
    try {
      setBusyAction(actionLabel);
      setStatusBanner(null);
      const res = await fetch("/api/pace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) {
        await fetchPaceState();
        if (payload.action === "seed60d") {
          setStatusBanner(
            "Committed 10 Feast-or-Famine episodes to Walrus Memory with live Tatum Sui checkpoint anchors."
          );
        } else if (payload.action === "veto") {
          setStatusBanner(
            "User Veto recorded in Walrus Memory: expanded drought runway horizon and raised untouchable checking floor."
          );
        } else {
          setStatusBanner(
            json.result?.allocation?.explanation ||
              "Processed event and updated Walrus Memory."
          );
        }
      }
    } finally {
      setBusyAction(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-slate-300">
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-6 py-4">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          <span>Recalling your cash-flow profile from Walrus Memory...</span>
        </div>
      </div>
    );
  }

  const metrics = data?.activeMetrics ?? {
    learnedDroughtDays: 14,
    dailyBurnUsd: 16,
    upcomingLiabilityUsd: 0,
    safeFloorUsd: 100,
    confidenceScore: 0.15,
  };

  const alloc = data?.currentAllocation;
  const comp = data?.comparison;
  const memoriesCount = data?.totalMemoriesStored ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Navigation & Invisible UX Header */}
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-lg">
              P
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Pace
                </h1>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  Feast-or-Famine Adaptive Vault
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Smooths irregular payouts across dry weeks • Learns your real burn & drought cycle
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                data?.mode === "mainnet" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="text-slate-300 font-medium">
              Walrus: {data?.mode === "mainnet" ? "Mainnet Live" : "Local Mock"}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400 font-semibold">
              {memoriesCount}/10 Memories
            </span>
          </div>

          <button
            onClick={() => setShowJudgeInspector((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
          >
            {showJudgeInspector ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-emerald-400" />
                Hide Under-the-Hood Proof
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                Judge Inspector (Walrus + Tatum)
              </>
            )}
          </button>
        </div>
      </header>

      {/* Status Banner */}
      {statusBanner && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{statusBanner}</span>
          </div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-xs text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Consumer Fintech Metrics (Invisible Blockchain UX) */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SAFE TO SPEND TODAY</span>
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            ${alloc?.dailySafeSpendUsd ?? metrics.dailyBurnUsd}
            <span className="text-sm font-normal text-slate-400">/day</span>
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Untouchable checking floor:{" "}
            <span className="text-slate-200 font-medium">
              ${metrics.safeFloorUsd}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SYNTHETIC WEEKLY PAYDAY</span>
            <CalendarClock className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            ${alloc?.weeklyPaceDripUsd ?? 175}
            <span className="text-sm font-normal text-slate-400">/wk</span>
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Auto-dripped across{" "}
            <span className="text-sky-300 font-medium">
              {metrics.learnedDroughtDays} learned drought days
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>DROUGHT RUNWAY LOCKED</span>
            <ShieldCheck className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            ${alloc?.runwayReserveUsd ?? 420}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Includes{" "}
            <span className="text-amber-300 font-medium">
              ${metrics.upcomingLiabilityUsd}
            </span>{" "}
            for learned bill clusters
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-5">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span>TRUE SURPLUS SWEPT</span>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            ${alloc?.trueSurplusSweepUsd ?? 0}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Memory Confidence:{" "}
            <span className="text-emerald-300 font-semibold">
              {Math.round(metrics.confidenceScore * 100)}% (v
              {data?.latestSequenceVersion ?? 0})
            </span>
          </p>
        </div>
      </section>

      {/* Main Grid: Interactive Feast-or-Famine Controls + Before/After Learning Proof */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Interactive Cash-Flow & Memory Simulator */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
                Simulate Cash-Flow & Memory Loop
              </h2>
              <span className="text-xs text-slate-400">Writes to Walrus</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Test how Pace separates real bounty payouts from self-swaps and adapts when cash gets tight.
            </p>

            {/* Inflow Form */}
            <div className="mt-4 space-y-3 rounded-xl border border-slate-800/90 bg-slate-950/60 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400">
                    Inflow Amount ($)
                  </label>
                  <input
                    type="number"
                    value={inflowAmount}
                    onChange={(e) => setInflowAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400">
                    Days Since Last Payout
                  </label>
                  <input
                    type="number"
                    value={observedGapDays}
                    onChange={(e) => setObservedGapDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400">
                  Payout Source / Counterparty Label
                </label>
                <input
                  type="text"
                  value={inflowSource}
                  onChange={(e) => setInflowSource(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                <button
                  disabled={Boolean(busyAction)}
                  onClick={() =>
                    runAction("inflow", {
                      action: "inflow",
                      inflowAmountUsd: inflowAmount,
                      currentCheckingUsd: 220,
                      sourceLabel: inflowSource,
                      counterpartyType: "VERIFIED_BOUNTY_PAYOUT",
                      observedDroughtDays: observedGapDays,
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  {busyAction === "inflow"
                    ? "Committing..."
                    : "Log Bounty Payout"}
                </button>

                <button
                  disabled={Boolean(busyAction)}
                  onClick={() =>
                    runAction("swap", {
                      action: "inflow",
                      inflowAmountUsd: 210,
                      currentCheckingUsd: 220,
                      sourceLabel: "Cetus DEX Swap / Self Transfer",
                      counterpartyType: "DEX_SWAP_RETURN",
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
                >
                  {busyAction === "swap"
                    ? "Checking..."
                    : "Test Self-Swap ($0 Sweep)"}
                </button>
              </div>
            </div>

            {/* Veto Override Button */}
            <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-950/15 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Famine Override (&ldquo;Cash is Tight&rdquo;)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Recalls $60 immediately and trains Walrus Memory to lock a longer drought runway next payout.
                  </p>
                </div>
                <button
                  disabled={Boolean(busyAction)}
                  onClick={() =>
                    runAction("veto", {
                      action: "veto",
                      emergencyRecallUsd: 60,
                      reason: "Bounty payout delayed past expected window",
                    })
                  }
                  className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50 transition"
                >
                  {busyAction === "veto" ? "Updating..." : "Cash is Tight"}
                </button>
              </div>
            </div>
          </div>

          {/* 1-Click 60-Day / 10-Memory Hackathon Seeder */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              disabled={Boolean(busyAction)}
              onClick={() => runAction("seed60d", { action: "seed60d" })}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 transition"
            >
              <Zap className="h-4 w-4 text-emerald-400" />
              {busyAction === "seed60d"
                ? "Writing 10 Episodes to Walrus Memory..."
                : "Replay 60-Day Feast/Famine Cycle (Seeds 10 Walrus Memories)"}
            </button>
          </div>
        </div>

        {/* Right Column: Before vs. After Walrus Memory Learning Proof */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-white">
                  How Walrus Memory Changed Pace’s Behavior
                </h2>
                <p className="text-xs text-slate-400">
                  Side-by-side split on a $1,000 payout (+ $220 checking) • Cold Start vs. Learned Profile (v
                  {data?.latestSequenceVersion ?? 0})
                </p>
              </div>
              {comp && comp.overSweepPreventedUsd > 0 && (
                <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Prevented ${comp.overSweepPreventedUsd} Overdraft Over-Sweep
                </span>
              )}
            </div>

            {/* Comparison Bars */}
            {comp && (
              <div className="mt-6 space-y-6">
                {/* Bar 1: Cold Start */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Session 1 (Cold Start — 0 Memories)
                    </span>
                    <span className="text-slate-400">
                      Assumes naive 14-day pay cycle & $0 upcoming bills
                    </span>
                  </div>
                  <div className="mt-3 flex h-7 w-full overflow-hidden rounded-lg bg-slate-800 text-[11px] font-semibold">
                    <div
                      style={{
                        width: `${Math.round(
                          (comp.coldStartAllocation.runwayReserveUsd /
                            comp.coldStartAllocation
                              .totalAvailableLiquidityUsd) *
                            100
                        )}%`,
                      }}
                      className="flex items-center justify-center bg-sky-500/80 text-slate-950"
                    >
                      Runway: ${comp.coldStartAllocation.runwayReserveUsd}
                    </div>
                    <div
                      style={{
                        width: `${Math.round(
                          (comp.coldStartAllocation.trueSurplusSweepUsd /
                            comp.coldStartAllocation
                              .totalAvailableLiquidityUsd) *
                            100
                        )}%`,
                      }}
                      className="flex items-center justify-center bg-rose-500/80 text-white"
                    >
                      Over-Swept: ${comp.coldStartAllocation.trueSurplusSweepUsd}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-rose-300/90">
                    ⚠️ Naive saver locks $896 away on Day 1, causing an overdraft when a 26-day bounty drought and $85 ISP bill hit.
                  </p>
                </div>

                {/* Bar 2: After Walrus Memory Learning */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300">
                      Active Session (Recalled from Walrus Memory v
                      {data?.latestSequenceVersion ?? 0})
                    </span>
                    <span className="text-emerald-400">
                      Learned {metrics.learnedDroughtDays}-day drought + $
                      {metrics.upcomingLiabilityUsd} bill reserve
                    </span>
                  </div>
                  <div className="mt-3 flex h-7 w-full overflow-hidden rounded-lg bg-slate-800 text-[11px] font-semibold">
                    <div
                      style={{
                        width: `${Math.round(
                          (comp.learnedAllocation.runwayReserveUsd /
                            comp.learnedAllocation
                              .totalAvailableLiquidityUsd) *
                            100
                        )}%`,
                      }}
                      className="flex items-center justify-center bg-amber-400 text-slate-950"
                    >
                      Protected Runway: ${comp.learnedAllocation.runwayReserveUsd}
                    </div>
                    <div
                      style={{
                        width: `${Math.round(
                          (comp.learnedAllocation.trueSurplusSweepUsd /
                            comp.learnedAllocation
                              .totalAvailableLiquidityUsd) *
                            100
                        )}%`,
                      }}
                      className="flex items-center justify-center bg-emerald-500 text-slate-950"
                    >
                      Safe Sweep: ${comp.learnedAllocation.trueSurplusSweepUsd}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-emerald-200/90">
                    ✓ {comp.learnedAllocation.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Learned Parameters Summary Footer */}
          <div className="mt-6 grid grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center text-xs">
            <div>
              <span className="text-slate-400 block">Drought Horizon</span>
              <span className="font-bold text-white">
                {metrics.learnedDroughtDays} Days
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Daily Burn</span>
              <span className="font-bold text-white">
                ${metrics.dailyBurnUsd}/day
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Bill Reserve</span>
              <span className="font-bold text-amber-300">
                ${metrics.upcomingLiabilityUsd}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Safety Floor</span>
              <span className="font-bold text-emerald-300">
                ${metrics.safeFloorUsd}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Under-the-Hood Judge Inspector (Walrus Blobs + Tatum Sui Checkpoints) */}
      {showJudgeInspector && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-400" />
                Under the Hood: Walrus Memory State Envelopes & Tatum Sui RPC Anchor
              </h2>
              <p className="text-xs text-slate-400">
                Append-only monotonic state resolution (`pace.v1`) • Every memory write is anchored to a live Sui Mainnet checkpoint
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-300">
                Sui Checkpoint:{" "}
                <strong className="text-emerald-400">
                  #{data?.walletSnapshot?.anchor?.checkpointSequence}
                </strong>{" "}
                (Epoch {data?.walletSnapshot?.anchor?.epoch})
              </span>
              <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-300">
                Namespace:{" "}
                <strong className="text-sky-300">{data?.namespace}</strong>
              </span>
            </div>
          </div>

          {data?.history && data.history.length > 0 ? (
            <div className="mt-4 max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {[...data.history].reverse().map((item) => (
                <div
                  key={item.seqVersion}
                  className="flex flex-col justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-950/70 p-3.5 text-xs sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono font-bold text-emerald-300">
                        seq v{item.seqVersion}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-slate-300">
                        {item.type}
                      </span>
                      <span className="text-slate-400 font-mono">
                        Sui Checkpoint #{item.suiAnchor?.checkpointSequence}
                      </span>
                      <span className="text-slate-500 font-mono">
                        ID: {item.blobOrJobId}
                      </span>
                    </div>
                    <p className="text-slate-200">{item.summaryText}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-slate-400">
                    <span>Drought: {item.metrics.learnedDroughtDays}d</span>
                    <span>Burn: ${item.metrics.dailyBurnUsd}</span>
                    <span className="text-emerald-400">
                      Conf: {Math.round(item.metrics.confidenceScore * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
              <Layers className="mx-auto mb-2 h-6 w-6 text-slate-500" />
              No memories in this session yet. Click{" "}
              <strong className="text-emerald-300">
                &ldquo;Replay 60-Day Feast/Famine Cycle&rdquo;
              </strong>{" "}
              or{" "}
              <strong className="text-emerald-300">
                &ldquo;Log Bounty Payout&rdquo;
              </strong>{" "}
              above to commit your first versioned episodes to Walrus Memory.
            </div>
          )}
        </section>
      )}
    </main>
  );
}