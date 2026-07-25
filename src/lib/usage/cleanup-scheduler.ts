import {
  cleanupExpiredUsageContent,
  USAGE_CONTENT_RETENTION_MS,
} from "#/lib/database/usage.repository";

export { USAGE_CONTENT_RETENTION_MS };
export const USAGE_CONTENT_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

type CleanupState = {
  timer?: ReturnType<typeof setInterval>;
  running: boolean;
};

const schedulerGlobal = globalThis as typeof globalThis & {
  __ohMyAiGatewayUsageContentCleanup?: CleanupState;
};

const getState = (): CleanupState => {
  return (schedulerGlobal.__ohMyAiGatewayUsageContentCleanup ??= { running: false });
};

export const runUsageContentCleanup = async (): Promise<void> => {
  const state = getState();
  if (state.running) return;
  state.running = true;
  try {
    const deleted = await cleanupExpiredUsageContent(new Date());
    if (deleted > 0) console.info(`Removed ${deleted} expired usage content record(s)`);
  } catch (error) {
    console.error("Failed to clean up expired usage content", error);
  } finally {
    state.running = false;
  }
};

export const startUsageContentCleanup = (): void => {
  const state = getState();
  if (state.timer) return;

  void runUsageContentCleanup();
  const timer = setInterval(() => void runUsageContentCleanup(), USAGE_CONTENT_CLEANUP_INTERVAL_MS);
  timer.unref?.();
  state.timer = timer;
};
