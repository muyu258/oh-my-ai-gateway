import type { Metadata } from "next";

import {
  getProviderSummaries,
  type ProviderStatisticsPeriod,
} from "#/lib/database/provider.repository";
import { ProvidersView } from "./_components/providers-view";

export const metadata: Metadata = {
  title: "Providers | Oh My AI Gateway",
};

export const dynamic = "force-dynamic";

const statisticsPeriods = new Set<ProviderStatisticsPeriod>([
  "30m",
  "1h",
  "6h",
  "24h",
  "7d",
  "30d",
  "all",
]);

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestedPeriod = resolvedSearchParams.period ?? resolvedSearchParams.responseTimePeriod;
  const periodValue = Array.isArray(requestedPeriod) ? requestedPeriod[0] : requestedPeriod;
  const statisticsPeriod = statisticsPeriods.has(periodValue as ProviderStatisticsPeriod)
    ? (periodValue as ProviderStatisticsPeriod)
    : "30m";
  const providers = await getProviderSummaries(statisticsPeriod);

  return <ProvidersView providers={providers} statisticsPeriod={statisticsPeriod} />;
}
