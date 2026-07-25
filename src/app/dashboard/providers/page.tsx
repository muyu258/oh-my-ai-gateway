import type { Metadata } from "next";

import {
  getProviderSummaries,
  type ProviderResponseTimePeriod,
} from "#/lib/database/provider.repository";
import { ProvidersView } from "./_components/providers-view";

export const metadata: Metadata = {
  title: "Providers | Oh My AI Gateway",
};

export const dynamic = "force-dynamic";

const responseTimePeriods = new Set<ProviderResponseTimePeriod>([
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
  const requestedPeriod = (await searchParams).responseTimePeriod;
  const periodValue = Array.isArray(requestedPeriod) ? requestedPeriod[0] : requestedPeriod;
  const responseTimePeriod = responseTimePeriods.has(periodValue as ProviderResponseTimePeriod)
    ? (periodValue as ProviderResponseTimePeriod)
    : "30m";
  const providers = await getProviderSummaries(responseTimePeriod);

  return <ProvidersView providers={providers} responseTimePeriod={responseTimePeriod} />;
}
