export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startUsageContentCleanup } = await import("#/lib/usage/cleanup-scheduler");
  startUsageContentCleanup();
}
