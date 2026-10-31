import { MemWal, MemWalMock } from "@mysten-incubation/memwal";

export type PaceMemoryMode = "mainnet" | "mock";

const globalForMemWal = globalThis as unknown as {
  memwalMockInstance?: ReturnType<typeof MemWalMock.create>;
};

export function getPaceMemoryConfig() {
  const requestedMode = (process.env.PACE_MEMORY_MODE || "mock").toLowerCase();
  const privateKey = process.env.MEMWAL_PRIVATE_KEY || "";
  const accountId = process.env.MEMWAL_ACCOUNT_ID || "";
  const agentId = process.env.MEMWAL_AGENT_ID || "";
  const serverUrl =
    process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz";
  const namespace = process.env.MEMWAL_NAMESPACE || "pace-mainnet-v1";

  const hasMainnetCreds = Boolean(privateKey && accountId);
  const activeMode: PaceMemoryMode =
    requestedMode === "mainnet" && hasMainnetCreds ? "mainnet" : "mock";

  return {
    activeMode,
    hasMainnetCreds,
    privateKey,
    accountId,
    agentId,
    serverUrl,
    namespace,
  };
}

export function getMemWalClient() {
  const cfg = getPaceMemoryConfig();

  if (cfg.activeMode === "mainnet") {
    return {
      mode: "mainnet" as const,
      namespace: cfg.namespace,
      client: MemWal.create({
        key: cfg.privateKey,
        accountId: cfg.accountId,
        serverUrl: cfg.serverUrl,
        namespace: cfg.namespace,
      }),
    };
  }

  if (!globalForMemWal.memwalMockInstance) {
    globalForMemWal.memwalMockInstance = MemWalMock.create({
      namespace: cfg.namespace,
    });
  }

  return {
    mode: "mock" as const,
    namespace: cfg.namespace,
    client: globalForMemWal.memwalMockInstance,
  };
}