
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Sparkles,
  CalendarClock,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff,
  Zap,
  TrendingUp,
} from "lucide-react";

interface PaceMemoryMetrics {
  learnedDroughtDays: number;
  dailyBurnUsd: number;
  upcomingLiabilityUsd: number;
  safeFloorUsd: number;
  confidenceScore: number;
}

interface AllocationBreakdown {
  dailySafeSpendUsd: number;
  weeklyPaceDripUsd: number;
  runwayReserveUsd: number;
  trueSurplusSweepUsd: number;
  explanation: string;
}

interface PaceApiResponse {
  ok: boolean;
  mode: "mainnet" | "mock";
  totalMemoriesStored: number;
  latestSequenceVersion: number;
  activeMetrics: PaceMemoryMetrics;
  currentAllocation: AllocationBreakdown;
  comparison?: {
    overSweepPreventedUsd: number;
  };
  history?: Array<{ summaryText: string }>;
}

export default function PaceDashboardPage() {
  const [data, setData] = useState<PaceApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  const fetchPaceState = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pace", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaceState();
  }, [fetchPaceState]);

  async function runAction(label: string, payload: Record<string, unknown>) {
    try {
      setBusyAction(label);
      setStatusBanner(null);
      const res = await fetch("/api/pace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) {
        await fetchPaceState();
        setStatusBanner(
          payload.action === "seed60d"
            ? "Seeded 10 Walrus Memory episodes. Learning loop active."
            : "Memory updated."
        );
      }
    } finally {
      setBusyAction(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          <span>Loading Pace...</span>
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
  const latestMemory = data?.history?.[0]?.summaryText;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">
              P
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Pace</h1>
              <p className="text-xs text-slate-400">
                Protects airdrop farmers & bounty hunters from long dry spells
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900">
              <span className="text-emerald-400 font-medium">
                {data?.totalMemoriesStored ?? 0}/10
              </span>{" "}
              memories
            </div>
            <button
              onClick={() => setShowInspector((v) => !v)}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800"
            >
              {showInspector ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              Inspector
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-5 py-4">
          <p className="text-sm font-medium text-emerald-300 mb-1">Judge’s 60-Second Path</p>
          <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
            <li>Click <strong>Replay 60-Day Airdrop Cycle</strong></li>
            <li>Watch learned drought days and confidence rise</li>
            <li>Click <strong>Log Bounty Payout</strong></li>
            <li>See how much more was protected vs a cold start</li>
          </ol>
        </div>

        {statusBanner && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {statusBanner}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard
            icon={<Wallet className="h-4 w-4 text-emerald-400" />}
            label="Safe to spend"
            value={`$${alloc?.dailySafeSpendUsd ?? metrics.dailyBurnUsd}`}
            sub="/ day"
          />
          <MetricCard
            icon={<CalendarClock className="h-4 w-4 text-sky-400" />}
            label="Weekly drip"
            value={`$${alloc?.weeklyPaceDripUsd ?? 0}`}
            sub="/ week"
          />
          <MetricCard
            icon={<ShieldCheck className="h-4 w-4 text-amber-400" />}
            label="Runway locked"
            value={`$${alloc?.runwayReserveUsd ?? 0}`}
            sub={`${metrics.learnedDroughtDays} days`}
          />
          <MetricCard
            icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
            label="Surplus swept"
            value={`$${alloc?.trueSurplusSweepUsd ?? 0}`}
            highlight
          />
        </div>

        <p className="text-xs text-slate-400 mb-2">
          Learned: {metrics.learnedDroughtDays}-day drought · ${metrics.dailyBurnUsd}/day burn · ${metrics.upcomingLiabilityUsd} bills reserved
        </p>

        {(data?.totalMemoriesStored ?? 0) < 5 && (
          <p className="text-xs text-amber-400/80 mb-6">
            Seed memories to see the full learning effect and protected amount.
          </p>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              Demo Actions
            </h2>

            <button
              disabled={!!busyAction}
              onClick={() => runAction("seed", { action: "seed60d" })}
              className="w-full mb-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              {busyAction === "seed" ? "Seeding..." : "Replay 60-Day Airdrop Cycle (10 Memories)"}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!!busyAction}
                onClick={() =>
                  runAction("inflow", {
                    action: "inflow",
                    inflowAmountUsd: 950,
                    currentCheckingUsd: 220,
                    sourceLabel: "Bounty Payout",
                    counterpartyType: "VERIFIED_BOUNTY_PAYOUT",
                    observedDroughtDays: 24,
                  })
                }
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Log Bounty Payout
              </button>

              <button
                disabled={!!busyAction}
                onClick={() =>
                  runAction("swap", {
                    action: "inflow",
                    inflowAmountUsd: 210,
                    currentCheckingUsd: 220,
                    sourceLabel: "DEX Swap",
                    counterpartyType: "DEX_SWAP_RETURN",
                  })
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                Test Self-Swap
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              Memory Effect
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Learned drought</span>
                <span className="text-white font-medium">{metrics.learnedDroughtDays} days</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Daily burn</span>
                <span className="text-white font-medium">${metrics.dailyBurnUsd}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Confidence</span>
                <span className="text-emerald-400 font-medium">
                  {Math.round(metrics.confidenceScore * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Protected more than cold start</span>
                <span className="text-emerald-400 font-medium">
                  {data?.comparison?.overSweepPreventedUsd
                    ? `$${data.comparison.overSweepPreventedUsd}`
                    : "—"}
                </span>
              </div>
              {latestMemory && (
                <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <span className="text-slate-500">Latest memory:</span> {latestMemory}
                </div>
              )}
              <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                {alloc?.explanation || "Seed memories to see how Pace adapts."}
              </div>
            </div>
          </div>
        </div>

        {showInspector && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-xs text-slate-400">
            <p className="font-medium text-slate-200 mb-2">Under the hood</p>
            <p>Mode: {data?.mode ?? "mock"}</p>
            <p>Memories stored: {data?.totalMemoriesStored ?? 0}</p>
            <p>Sequence version: {data?.latestSequenceVersion ?? 0}</p>
            <p className="mt-2 text-slate-300">
              These memories are written to Walrus and change how Pace protects cash on the next payout.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${highlight
        ? "border-emerald-500/40 bg-emerald-950/20"
        : "border-slate-800 bg-slate-900/40"
        }`}
    >
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-white">
        {value}
        {sub && <span className="text-sm font-normal text-slate-400 ml-1">{sub}</span>}
      </p>
    </div>
  );
}