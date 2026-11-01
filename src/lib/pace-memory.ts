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

// Keeps newly written Mainnet envelopes immediately visible while Walrus finishes async indexing
const globalMemoryCache = globalThis as unknown as {
  paceEnvelopeCache?: Map<number, PaceMemoryEnvelope>;
};

function getEnvelopeCache(): Map<number, PaceMemoryEnvelope> {
  if (!globalMemoryCache.paceEnvelopeCache) {
    globalMemoryCache.paceEnvelopeCache = new Map<number, PaceMemoryEnvelope>();
  }
  return globalMemoryCache.paceEnvelopeCache;
}

function serializeEnvelope(envelope: PaceMemoryEnvelope): string {
  return `${envelope.summaryText} ||PACE_JSON::${JSON.stringify(envelope)}`;
}

function parseEnvelope(
  rawText: string,
  blobId?: string
): PaceMemoryEnvelope | null {
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

export async function recallPaceMemoryState() {
  const { client, mode, namespace } = getMemWalClient();
  const cache = getEnvelopeCache();
  let warningMessage: string | null = null;

  try {
    const recallRes = await client.recall({
      query:
        "pace.v1 cashflow profile drought days daily burn liability veto inflow",
      topK: 25,
    });

    for (const item of recallRes.results || []) {
      const env = parseEnvelope(item.text, item.blob_id ?? undefined);
      if (env) {
        cache.set(env.seqVersion, env);
      }
    }
  } catch (err) {
    warningMessage =
      err instanceof Error ? err.message : "Walrus recall warning";
    console.error("[Walrus Mainnet Recall Error]:", warningMessage);
  }

  const parsedMemories = Array.from(cache.values()).sort(
    (a, b) => a.seqVersion - b.seqVersion
  );

  const latestMemory =
    parsedMemories.length > 0
      ? parsedMemories[parsedMemories.length - 1]
      : null;

  return {
    mode,
    namespace,
    warningMessage,
    totalMemoriesStored: parsedMemories.length,
    activeMetrics: latestMemory
      ? latestMemory.metrics
      : DEFAULT_COLD_START_METRICS,
    latestSequenceVersion: latestMemory ? latestMemory.seqVersion : 0,
    history: parsedMemories,
  };
}

export async function commitPaceMemoryEpisode(params: {
  type: PaceMemoryType;
  entityKey?: string;
  summaryText: string;
  metrics: PaceMemoryMetrics;
}) {
  const { client, mode, namespace } = getMemWalClient();
  const cache = getEnvelopeCache();
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
  let jobOrBlobId = `walrus-seq-${nextSeq}`;
  let writeResult: unknown = null;

  try {
    if (mode === "mainnet") {
      // Submit directly to Walrus Mainnet Relayer async job queue so UI never times out
      const res = await client.remember(payload);
      writeResult = res;
      jobOrBlobId =
        (res as { blob_id?: string; job_id?: string })?.blob_id ||
        (res as { job_id?: string })?.job_id ||
        `mainnet-job-v${nextSeq}`;
    } else {
      const res = await client.rememberAndWait(payload, undefined, {
        timeoutMs: 15_000,
      });
      writeResult = res;
      jobOrBlobId =
        (res as { blob_id?: string; job_id?: string })?.blob_id ||
        (res as { job_id?: string })?.job_id ||
        `mock-blob-v${nextSeq}`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Walrus Mainnet Write Error]:", msg);
    jobOrBlobId = `relayer-pending-v${nextSeq}`;
  }

  envelope.blobOrJobId = jobOrBlobId;
  cache.set(nextSeq, envelope);

  return {
    mode,
    namespace,
    committedEnvelope: envelope,
    writeResult,
  };
}