export type ProviderOrderPlacement = "before" | "after";

type OrderedProvider = { id: string; order: number };

export const reorderProviders = (
  records: OrderedProvider[],
  sourceId: string,
  targetId: string,
  placement: ProviderOrderPlacement,
): OrderedProvider[] => {
  if (sourceId === targetId) throw new Error("Provider IDs must be different.");

  const sourceIndex = records.findIndex(({ id }) => id === sourceId);
  const targetIndex = records.findIndex(({ id }) => id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) throw new Error("Both providers must exist.");

  const reordered = [...records];
  const [source] = reordered.splice(sourceIndex, 1);
  const targetIndexWithoutSource = reordered.findIndex(({ id }) => id === targetId);
  reordered.splice(targetIndexWithoutSource + (placement === "after" ? 1 : 0), 0, source!);
  return reordered;
};
