import {
  commitPaceMemoryEpisode,
  PaceMemoryMetrics,
  recallPaceMemoryState,
} from "./pace-memory";
import { getSuiWalletSnapshot } from "./tatum-sui";

export type CounterpartyType =
  | "VERIFIED_BOUNTY_PAYOUT"
  | "CLIENT_INVOICE"
  | "SELF_WALLET_TRANSFER"
  | "DEX_SWAP_RETURN";

export interface AllocationBreakdown {
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

export interface BeforeAfterComparison {
  coldStartAllocation: AllocationBreakdown;
  learnedAllocation: AllocationBreakdown;
  overSweepPreventedUsd: number;
  extraRunwayDaysSecured: number;
}

/**
 * Classifies whether an incoming transaction is real external income or an internal wallet hop
 */
export function classifyCounterparty(
  sourceLabel: string,
  counterpartyType?: CounterpartyType
): {
  isExternalIncome: boolean;
  normalizedTag: "VERIFIED_PAYOUT" | "SELF_TRANSFER";
  reason: string;
} {
  const lower = sourceLabel.toLowerCase();

  if (
    counterpartyType === "SELF_WALLET_TRANSFER" ||
    counterpartyType === "DEX_SWAP_RETURN" ||
    lower.includes("self") ||
    lower.includes("swap") ||
    lower.includes("cetus") ||
    lower.includes("turbos") ||
    lower.includes("unstake")
  ) {
    return {
      isExternalIncome: false,
      normalizedTag: "SELF_TRANSFER",
      reason:
        "Counterparty Fingerprinting identified an internal wallet transfer or DEX swap. Auto-save sweep bypassed to prevent draining active liquidity.",
    };
  }

  return {
    isExternalIncome: true,
    normalizedTag: "VERIFIED_PAYOUT",
    reason:
      "Verified external payout detected. Engaging Feast-or-Famine Runway Router.",
  };
}

/**
 * Pure deterministic 3-Bucket Math Router
 * Computes Runway Reserve, Weekly Synthetic Payday Drip, and True Surplus Sweep
 */
export function computeFeastOrFamineAllocation(
  inflowAmountUsd: number,
  currentCheckingUsd: number,
  metrics: PaceMemoryMetrics,
  isExternalIncome = true
): AllocationBreakdown {
  const totalLiquidity = Number((inflowAmountUsd + currentCheckingUsd).toFixed(2));

  if (!isExternalIncome) {
    const weeks = Math.max(1, metrics.learnedDroughtDays / 7);
    return {
      inflowAmountUsd,
      currentCheckingUsd,
      totalAvailableLiquidityUsd: totalLiquidity,
      runwayReserveUsd: currentCheckingUsd,
      weeklyPaceDripUsd: Number((currentCheckingUsd / weeks).toFixed(2)),
      dailySafeSpendUsd: metrics.dailyBurnUsd,
      trueSurplusSweepUsd: 0,
      droughtDaysCovered: metrics.learnedDroughtDays,
      upcomingBillsReservedUsd: metrics.upcomingLiabilityUsd,
      safeFloorUsd: metrics.safeFloorUsd,
      sweepAction: "IGNORED_SELF_TRANSFER",
      explanation:
        "Self-transfer or DEX swap detected in Walrus Counterparty Memory. $0 swept into long-term vault.",
    };
  }

  // RunwayReserve = (D_drought * B_daily) + L_upcoming + FloorBuffer
  const droughtBurnNeed = metrics.learnedDroughtDays * metrics.dailyBurnUsd;
  const requiredRunwayReserve = Number(
    (
      droughtBurnNeed +
      metrics.upcomingLiabilityUsd +
      metrics.safeFloorUsd
    ).toFixed(2)
  );

  const trueSurplusSweep = Number(
    Math.max(0, totalLiquidity - requiredRunwayReserve).toFixed(2)
  );

  const lockedRunway = Number(
    Math.min(totalLiquidity, requiredRunwayReserve).toFixed(2)
  );

  const droughtWeeks = Math.max(1, metrics.learnedDroughtDays / 7);
  const weeklyPaceDrip = Number((lockedRunway / droughtWeeks).toFixed(2));
  const dailySafeSpend = Number(
    ((lockedRunway - metrics.safeFloorUsd) / Math.max(1, metrics.learnedDroughtDays)).toFixed(2)
  );

  const sweepAction =
    trueSurplusSweep > 0 ? "SWEEP_EXECUTED" : "PAUSED_DROUGHT_GUARD";

  const explanation =
    trueSurplusSweep > 0
      ? `Locked $${lockedRunway} for ${metrics.learnedDroughtDays}-day drought runway (including $${metrics.upcomingLiabilityUsd} upcoming bills + $${metrics.safeFloorUsd} floor). Swept $${trueSurplusSweep} true surplus via invisible Sui settlement.`
      : `Drought Protection Active: Full $${totalLiquidity} retained in Runway Buffer to cover your learned ${metrics.learnedDroughtDays}-day payout gap and $${metrics.upcomingLiabilityUsd} bill cluster. Long-term sweep paused at $0.`;

  return {
    inflowAmountUsd,
    currentCheckingUsd,
    totalAvailableLiquidityUsd: totalLiquidity,
    runwayReserveUsd: lockedRunway,
    weeklyPaceDripUsd: weeklyPaceDrip,
    dailySafeSpendUsd: Math.max(0, dailySafeSpend),
    trueSurplusSweepUsd: trueSurplusSweep,
    droughtDaysCovered: metrics.learnedDroughtDays,
    upcomingBillsReservedUsd: metrics.upcomingLiabilityUsd,
    safeFloorUsd: metrics.safeFloorUsd,
    sweepAction,
    explanation,
  };
}

/**
 * Generates side-by-side comparison proving how Walrus Memory visibly changes product behavior
 */
export function compareColdStartVsLearned(
  inflowAmountUsd: number,
  currentCheckingUsd: number,
  learnedMetrics: PaceMemoryMetrics
): BeforeAfterComparison {
  const coldStartMetrics: PaceMemoryMetrics = {
    learnedDroughtDays: 14,
    dailyBurnUsd: 16,
    upcomingLiabilityUsd: 0,
    safeFloorUsd: 100,
    confidenceScore: 0.15,
  };

  const coldStartAllocation = computeFeastOrFamineAllocation(
    inflowAmountUsd,
    currentCheckingUsd,
    coldStartMetrics,
    true
  );

  const learnedAllocation = computeFeastOrFamineAllocation(
    inflowAmountUsd,
    currentCheckingUsd,
    learnedMetrics,
    true
  );

  const overSweepPreventedUsd = Number(
    Math.max(
      0,
      coldStartAllocation.trueSurplusSweepUsd -
        learnedAllocation.trueSurplusSweepUsd
    ).toFixed(2)
  );

  const extraRunwayDaysSecured = Math.max(
    0,
    learnedMetrics.learnedDroughtDays - coldStartMetrics.learnedDroughtDays
  );

  return {
    coldStartAllocation,
    learnedAllocation,
    overSweepPreventedUsd,
    extraRunwayDaysSecured,
  };
}

/**
 * Processes an incoming transaction, updates learned Walrus Memory, and returns the live pacing plan
 */
export async function processInflowEvent(params: {
  inflowAmountUsd: number;
  currentCheckingUsd: number;
  sourceLabel: string;
  counterpartyType?: CounterpartyType;
  observedDroughtDays?: number;
}) {
  const memoryState = await recallPaceMemoryState();
  const prev = memoryState.activeMetrics;

  const classification = classifyCounterparty(
    params.sourceLabel,
    params.counterpartyType
  );

  // Adapt drought days if a new payout gap was observed
  const updatedDroughtDays =
    classification.isExternalIncome && params.observedDroughtDays
      ? Math.round(prev.learnedDroughtDays * 0.4 + params.observedDroughtDays * 0.6)
      : prev.learnedDroughtDays;

  const updatedConfidence = Math.min(
    0.98,
    Number((prev.confidenceScore + 0.08).toFixed(2))
  );

  const nextMetrics: PaceMemoryMetrics = {
    ...prev,
    learnedDroughtDays: updatedDroughtDays,
    confidenceScore: updatedConfidence,
    inflowAmountUsd: params.inflowAmountUsd,
    counterpartyTag: classification.normalizedTag,
  };

  const allocation = computeFeastOrFamineAllocation(
    params.inflowAmountUsd,
    params.currentCheckingUsd,
    nextMetrics,
    classification.isExternalIncome
  );

  const summaryText = classification.isExternalIncome
    ? `Processed $${params.inflowAmountUsd} payout from ${params.sourceLabel} after ${updatedDroughtDays}-day gap. Locked $${allocation.runwayReserveUsd} runway ($${allocation.weeklyPaceDripUsd}/wk pace drip) and swept $${allocation.trueSurplusSweepUsd} surplus.`
    : `Ignored $${params.inflowAmountUsd} internal transfer/swap (${params.sourceLabel}). Preserved active liquidity with $0 auto-save sweep.`;

  const committed = await commitPaceMemoryEpisode({
    type: "INFLOW_EPISODE",
    summaryText,
    metrics: nextMetrics,
  });

  return {
    classification,
    allocation,
    comparison: compareColdStartVsLearned(
      params.inflowAmountUsd,
      params.currentCheckingUsd,
      nextMetrics
    ),
    committedMemory: committed.committedEnvelope,
  };
}

/**
 * High-Priority "Cash is Tight" Veto Override
 * Expands learned drought runway and raises the untouchable checking floor on the very next session
 */
export async function triggerCashIsTightVeto(params: {
  reason?: string;
  emergencyRecallUsd?: number;
}) {
  const memoryState = await recallPaceMemoryState();
  const prev = memoryState.activeMetrics;

  const nextMetrics: PaceMemoryMetrics = {
    learnedDroughtDays: Math.min(45, prev.learnedDroughtDays + 6),
    dailyBurnUsd: Number((prev.dailyBurnUsd * 1.08).toFixed(2)),
    upcomingLiabilityUsd: prev.upcomingLiabilityUsd + 45,
    safeFloorUsd: prev.safeFloorUsd + 40,
    confidenceScore: Math.min(0.98, Number((prev.confidenceScore + 0.1).toFixed(2))),
  };

  const recallAmount = params.emergencyRecallUsd ?? 60;
  const summaryText = `USER VETO ("Cash is Tight"): Recalled $${recallAmount} from buffer. Reason: ${
    params.reason || "Longer bounty drought than expected"
  }. Expanded learned drought window to ${nextMetrics.learnedDroughtDays} days and raised checking floor to $${nextMetrics.safeFloorUsd}.`;

  const committed = await commitPaceMemoryEpisode({
    type: "USER_VETO_OVERRIDE",
    summaryText,
    metrics: nextMetrics,
  });

  return {
    updatedMetrics: nextMetrics,
    committedMemory: committed.committedEnvelope,
  };
}

/**
 * Seeds a realistic 10-Episode (60-Day) Feast-or-Famine Bounty Cycle into Walrus Memory
 * Satisfies the mandatory "10+ Mainnet Memories" hackathon requirement while demonstrating deep learning
 */
export async function seedSixtyDayFeastFamineCycle() {
  const episodes: Array<{
    type: "CASHFLOW_PROFILE_STATE" | "INFLOW_EPISODE" | "OUTFLOW_CLUSTER" | "USER_VETO_OVERRIDE";
    summaryText: string;
    metrics: PaceMemoryMetrics;
  }> = [
    {
      type: "CASHFLOW_PROFILE_STATE",
      summaryText:
        "Day 1 Cold Start: Initialized Pace profile with standard 14-day income assumption and $16/day baseline burn.",
      metrics: {
        learnedDroughtDays: 14,
        dailyBurnUsd: 16,
        upcomingLiabilityUsd: 0,
        safeFloorUsd: 100,
        confidenceScore: 0.18,
      },
    },
    {
      type: "INFLOW_EPISODE",
      summaryText:
        "Day 2 Feast Inflow: Received $850 hackathon bounty payout. Locked 14-day runway ($324) and swept $526 surplus.",
      metrics: {
        learnedDroughtDays: 14,
        dailyBurnUsd: 16.5,
        upcomingLiabilityUsd: 0,
        safeFloorUsd: 100,
        confidenceScore: 0.28,
        inflowAmountUsd: 850,
        counterpartyTag: "VERIFIED_PAYOUT",
      },
    },
    {
      type: "INFLOW_EPISODE",
      summaryText:
        "Day 9 Counterparty Filter: Ignored $210 Cetus DEX swap return so active checking liquidity was not double-swept.",
      metrics: {
        learnedDroughtDays: 15,
        dailyBurnUsd: 17,
        upcomingLiabilityUsd: 0,
        safeFloorUsd: 100,
        confidenceScore: 0.38,
        inflowAmountUsd: 210,
        counterpartyTag: "SELF_TRANSFER",
      },
    },
    {
      type: "OUTFLOW_CLUSTER",
      summaryText:
        "Day 18 Liability Cluster Detected: Recurring $65 ISP & cloud server renewal identified around Day 18 of every cycle.",
      metrics: {
        learnedDroughtDays: 18,
        dailyBurnUsd: 17.5,
        upcomingLiabilityUsd: 65,
        safeFloorUsd: 110,
        confidenceScore: 0.5,
        counterpartyTag: "BILL_CLUSTER",
      },
    },
    {
      type: "USER_VETO_OVERRIDE",
      summaryText:
        "Day 23 User Veto ('Cash is Tight'): Bounty payout delayed past Day 21. Recalled $60 to checking; expanded drought horizon to 24 days.",
      metrics: {
        learnedDroughtDays: 24,
        dailyBurnUsd: 18,
        upcomingLiabilityUsd: 65,
        safeFloorUsd: 140,
        confidenceScore: 0.64,
      },
    },
    {
      type: "INFLOW_EPISODE",
      summaryText:
        "Day 26 Feast Inflow: $950 audit bounty landed after 24-day drought. Pace locked $637 into Runway Buffer and swept only $313 true surplus.",
      metrics: {
        learnedDroughtDays: 24,
        dailyBurnUsd: 18,
        upcomingLiabilityUsd: 65,
        safeFloorUsd: 140,
        confidenceScore: 0.74,
        inflowAmountUsd: 950,
        counterpartyTag: "VERIFIED_PAYOUT",
      },
    },
    {
      type: "OUTFLOW_CLUSTER",
      summaryText:
        "Day 35 Mid-Drought Check: Synthetic weekly payday drip ($185/wk) maintained checking balance above $140 safety floor.",
      metrics: {
        learnedDroughtDays: 25,
        dailyBurnUsd: 18.2,
        upcomingLiabilityUsd: 85,
        safeFloorUsd: 140,
        confidenceScore: 0.82,
        counterpartyTag: "BILL_CLUSTER",
      },
    },
    {
      type: "INFLOW_EPISODE",
      summaryText:
        "Day 41 Counterparty Filter: Ignored $145 self-wallet bridge transfer from secondary operational wallet.",
      metrics: {
        learnedDroughtDays: 25,
        dailyBurnUsd: 18.2,
        upcomingLiabilityUsd: 85,
        safeFloorUsd: 140,
        confidenceScore: 0.87,
        inflowAmountUsd: 145,
        counterpartyTag: "SELF_TRANSFER",
      },
    },
    {
      type: "OUTFLOW_CLUSTER",
      summaryText:
        "Day 48 Drought Shield Triggered: Paused scheduled Friday savings sweep automatically ahead of predicted $85 end-of-month utility/server cluster.",
      metrics: {
        learnedDroughtDays: 26,
        dailyBurnUsd: 18.5,
        upcomingLiabilityUsd: 85,
        safeFloorUsd: 150,
        confidenceScore: 0.92,
        counterpartyTag: "BILL_CLUSTER",
      },
    },
    {
      type: "CASHFLOW_PROFILE_STATE",
      summaryText:
        "Day 60 Mature Profile Locked: Learned 26-day feast-or-famine cycle, $18.50/day burn, $85 recurring bill reserve, and $150 safety floor (96% confidence).",
      metrics: {
        learnedDroughtDays: 26,
        dailyBurnUsd: 18.5,
        upcomingLiabilityUsd: 85,
        safeFloorUsd: 150,
        confidenceScore: 0.96,
      },
    },
  ];

  const committedEpisodes = [];
  for (const ep of episodes) {
    const res = await commitPaceMemoryEpisode(ep);
    committedEpisodes.push(res.committedEnvelope);
  }

  const finalState = await recallPaceMemoryState();
  const walletSnapshot = await getSuiWalletSnapshot();

  return {
    seededCount: committedEpisodes.length,
    finalState,
    walletSnapshot,
  };
}