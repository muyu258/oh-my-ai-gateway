export type ProviderModelConfig = {
  aliases: string[];
};

export type ProviderModels = Record<string, ProviderModelConfig>;

const compareNames = (left: string, right: string): number => left.localeCompare(right);

export const normalizeModelName = (name: string): string => name.trim();

export const normalizeProviderModels = (models: ProviderModels): ProviderModels => {
  const normalizedEntries = Object.entries(models)
    .map(
      ([model, config]) =>
        [
          normalizeModelName(model),
          (config?.aliases ?? []).map(normalizeModelName).sort(compareNames),
        ] as const,
    )
    .filter(([model]) => model.length > 0)
    .sort(([left], [right]) => compareNames(left, right));
  const realModels = new Set(normalizedEntries.map(([model]) => model));
  const publicNames = new Set<string>();
  const result: ProviderModels = {};

  for (const [model, aliases] of normalizedEntries) {
    if (publicNames.has(model)) throw new Error(`Duplicate model name: ${model}`);
    publicNames.add(model);
    result[model] = { aliases: [] };

    for (const alias of aliases) {
      if (!alias) throw new Error("Model aliases cannot be empty.");
      if (realModels.has(alias) || publicNames.has(alias)) {
        throw new Error(`Model name and aliases must be unique: ${alias}`);
      }
      publicNames.add(alias);
      result[model]!.aliases.push(alias);
    }
  }

  return result;
};

export const getRealModels = (models: ProviderModels): string[] =>
  Object.keys(models).sort(compareNames);

export const getPublicModels = (models: ProviderModels): string[] => {
  const realModels = getRealModels(models);
  const realModelNames = new Set(realModels);
  const aliases = [
    ...new Set(
      Object.values(models)
        .flatMap(({ aliases: modelAliases }) => modelAliases)
        .filter((alias) => !realModelNames.has(alias)),
    ),
  ].sort(compareNames);

  return [...realModels, ...aliases];
};

export const getProviderModelCount = (models: ProviderModels): number =>
  getPublicModels(models).length;

export const resolveProviderModel = (
  models: ProviderModels,
  requestedName: string,
): { requestedModel: string; upstreamModel: string; isAlias: boolean } | undefined => {
  const requestedModel = normalizeModelName(requestedName);
  if (Object.hasOwn(models, requestedModel)) {
    return { requestedModel, upstreamModel: requestedModel, isAlias: false };
  }

  for (const [upstreamModel, { aliases }] of Object.entries(models)) {
    if (aliases.includes(requestedModel)) {
      return { requestedModel, upstreamModel, isAlias: true };
    }
  }
};

export const getTestModel = (
  models: ProviderModels,
  requestedTestModel: string | null | undefined,
): string | null => {
  const requested = requestedTestModel?.trim();
  if (requested && resolveProviderModel(models, requested)) return requested;
  return getRealModels(models)[0] ?? null;
};

export const addProviderModel = (models: ProviderModels, modelName: string): ProviderModels => {
  const model = normalizeModelName(modelName);
  if (!model) return models;
  if (resolveProviderModel(models, model)) return models;
  return normalizeProviderModels({ ...models, [model]: { aliases: [] } });
};

export const addProviderAlias = (
  models: ProviderModels,
  targetName: string,
  aliasName: string,
): ProviderModels => {
  const target = resolveProviderModel(models, targetName);
  const alias = normalizeModelName(aliasName);
  if (!target || !alias || resolveProviderModel(models, alias)) return models;
  return normalizeProviderModels({
    ...models,
    [target.upstreamModel]: {
      aliases: [...models[target.upstreamModel]!.aliases, alias],
    },
  });
};

export const removeProviderModelName = (
  models: ProviderModels,
  publicName: string,
): ProviderModels => {
  const resolved = resolveProviderModel(models, publicName);
  if (!resolved) return models;
  if (!resolved.isAlias) {
    return Object.fromEntries(
      Object.entries(models).filter(([model]) => model !== resolved.upstreamModel),
    );
  }
  return normalizeProviderModels({
    ...models,
    [resolved.upstreamModel]: {
      aliases: models[resolved.upstreamModel]!.aliases.filter(
        (alias) => alias !== resolved.requestedModel,
      ),
    },
  });
};
