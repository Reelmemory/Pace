import { NextRequest, NextResponse } from "next/server";
import { getPaceMemoryConfig } from "@/lib/memwal-client";
import { recallPaceMemoryState } from "@/lib/pace-memory";
import {
  compareColdStartVsLearned,
  computeFeastOrFamineAllocation,
  CounterpartyType,
  processInflowEvent,
  seedSixtyDayFeastFamineCycle,
  triggerCashIsTightVeto,
} from "@/lib/pace-router";
import { getSuiWalletSnapshot } from "@/lib/tatum-sui";

export async function GET() {
  try {
    const config = getPaceMemoryConfig();
    const [memoryState, walletSnapshot] = await Promise.all([
      recallPaceMemoryState(),
      getSuiWalletSnapshot(),
    ]);

    const previewInflowUsd = 1000;
    const currentCheckingUsd = 220;

    const currentAllocation = computeFeastOrFamineAllocation(
      previewInflowUsd,
      currentCheckingUsd,
      memoryState.activeMetrics,
      true
    );

    const comparison = compareColdStartVsLearned(
      previewInflowUsd,
      currentCheckingUsd,
      memoryState.activeMetrics
    );

    return NextResponse.json({
      ok: true,
      mode: memoryState.mode,
      namespace: memoryState.namespace,
      hasMainnetCreds: config.hasMainnetCreds,
      agentIdConfigured: Boolean(config.agentId),
      totalMemoriesStored: memoryState.totalMemoriesStored,
      latestSequenceVersion: memoryState.latestSequenceVersion,
      activeMetrics: memoryState.activeMetrics,
      walletSnapshot,
      currentAllocation,
      comparison,
      history: memoryState.history,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load Pace state",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === "inflow") {
      const result = await processInflowEvent({
        inflowAmountUsd: Number(body.inflowAmountUsd ?? 950),
        currentCheckingUsd: Number(body.currentCheckingUsd ?? 220),
        sourceLabel: String(body.sourceLabel || "Gibwork Bounty Payout"),
        counterpartyType: body.counterpartyType as CounterpartyType | undefined,
        observedDroughtDays: body.observedDroughtDays
          ? Number(body.observedDroughtDays)
          : undefined,
      });
      const updatedState = await recallPaceMemoryState();
      return NextResponse.json({ ok: true, action, result, updatedState });
    }

    if (action === "veto") {
      const result = await triggerCashIsTightVeto({
        reason: body.reason,
        emergencyRecallUsd: Number(body.emergencyRecallUsd ?? 60),
      });
      const updatedState = await recallPaceMemoryState();
      return NextResponse.json({ ok: true, action, result, updatedState });
    }

    if (action === "seed60d") {
      const result = await seedSixtyDayFeastFamineCycle();
      return NextResponse.json({ ok: true, action, result });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute Pace action",
      },
      { status: 500 }
    );
  }
}