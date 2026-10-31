import { getMemWalClient } from "./memwal-client";
import { getLiveSuiCheckpointAnchor, SuiChainAnchor } from "./tatum-sui";

export type PaceMemoryType =
  | "CASHFLOW_PROFILE_STATE"
  | "INFLOW_EPISODE"
  | "OUTFLOW_CLUSTER"
  | "USER_VETO_OVERRIDE";

export interface PaceMemoryMetrics {
  learnedDroughtDays: number;
  dailyBurnUsd: number;
  upcomingLiabilityUsd: number;
  safeFloorUsd: number;
  confidenceScore: number;
  inflowAmountUsd?: number;
  counterpartyTag?: "VERIFIED_PAYOUT" | "SELF_TRANSFER" | "BILL_CLUSTER";
}

export interface PaceMemoryEnvelope {
  schema: "pace.v1";
  type: PaceMemoryType;
  entityKey: string;
  seqVersion: number;
  timestampIso: string;
  suiAnchor: SuiChainAnchor;
  summaryText: string;
  metrics: PaceMemoryMetrics;
  blobOrJobId?: string;
}

const DEFAULT_COLD_START_METRICS: PaceMemoryMetrics = {
  learnedDroughtDays: 14,
  dailyBurnUsd: 16,
  upcomingLiabilityUsd: 0,
  safeFloorUsd: 100,
  confidenceScore: 0.15,
};

function serializeEnvelope(envelope: PaceMemoryEnvelope): string {
  return `${envelope.summaryText} ||PACE_JSON::${JSON.stringify(envelope)}`;
}

function parseEnvelope(rawText: string, blobId?: string): PaceMemoryEnvelope | null {
  const marker = "||PACE_JSON::";
  const idx = rawText.indexOf(marker);
  if (idx === -1) return null;

  try {
    const jsonPart = rawText.slice(idx + marker.length).trim();
    const parsed = JSON.parse(jsonPart) as PaceMemoryEnvelope;
    if (parsed?.schema === "pace.v1") {
      if (blobId && !parsed.blobOrJobId) {
        parsed.blobOrJobId = blobId;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Recalls all Pace memories from Walrus, resolves the highest seqVersion for active routing,
 * and preserves the full historical evolution for the judge inspector.
 */
export async function recallPaceMemoryState() {
  const { client, mode, namespace } = getMemWalClient();

  const recallRes = await client.recall({
    query: "pace.v1 cashflow profile drought days daily burn liability veto inflow",
    topK: 25,
    maxDistance: 0.99,
  });

  const parsedMemories: PaceMemoryEnvelope[] = [];
  for (const item of recallRes.results || []) {
    const env = parseEnvelope(item.text, item.blob_id ?? undefined);
    if (env) {
      parsedMemories.push(env);
    }
  }

  // Sort chronologically by seqVersion ascending for the evolution chart
  parsedMemories.sort((a, b) => a.seqVersion - b.seqVersion);

  const latestMemory =
    parsedMemories.length > 0
      ? parsedMemories[parsedMemories.length - 1]
      : null;

  return {
    mode,
    namespace,
    totalMemoriesStored: parsedMemories.length,
    activeMetrics: latestMemory
      ? latestMemory.metrics
      : DEFAULT_COLD_START_METRICS,
    latestSequenceVersion: latestMemory ? latestMemory.seqVersion : 0,
    history: parsedMemories,
  };
}

/**
 * Commits a new versioned memory episode to Walrus Memory anchored with a live Tatum Sui checkpoint
 */
export async function commitPaceMemoryEpisode(params: {
  type: PaceMemoryType;
  entityKey?: string;
  summaryText: string;
  metrics: PaceMemoryMetrics;
}) {
  const { client, mode, namespace } = getMemWalClient();
  const currentState = await recallPaceMemoryState();
  const nextSeq = currentState.latestSequenceVersion + 1;
  const suiAnchor = await getLiveSuiCheckpointAnchor();

  const envelope: PaceMemoryEnvelope = {
    schema: "pace.v1",
    type: params.type,
    entityKey: params.entityKey || "profile:primary",
    seqVersion: nextSeq,
    timestampIso: new Date().toISOString(),
    suiAnchor,
    summaryText: params.summaryText,
    metrics: params.metrics,
  };

  const payload = serializeEnvelope(envelope);
  const writeResult = await client.rememberAndWait(payload, undefined, {
    timeoutMs: 30_000,
  });

  const jobOrBlobId =
    (writeResult as { blobId?: string; jobId?: string })?.blobId ||
    (writeResult as { jobId?: string })?.jobId ||
    `walrus-seq-${nextSeq}`;

  envelope.blobOrJobId = jobOrBlobId;

  return {
    mode,
    namespace,
    committedEnvelope: envelope,
    writeResult,
  };
}