import { MemWal, MemWalMock } from "@mysten-incubation/memwal";

export type PaceMemoryMode = "mainnet" | "mock";

const globalForMemWal = globalThis as unknown as {
  memwalMockInstance?: ReturnType<typeof MemWalMock.create>;
  memwalMainnetInstance?: ReturnType<typeof MemWal.create>;
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
    if (!globalForMemWal.memwalMainnetInstance) {
      try {
        globalForMemWal.memwalMainnetInstance = MemWal.create({
          key: cfg.privateKey,
          accountId: cfg.accountId,
          serverUrl: cfg.serverUrl,
          namespace: cfg.namespace,
        });
      } catch {
        // Fallback to mock instance if network client initialization fails
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
    }

    return {
      mode: "mainnet" as const,
      namespace: cfg.namespace,
      client: globalForMemWal.memwalMainnetInstance,
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