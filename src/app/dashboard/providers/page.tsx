import type { Metadata } from "next";

import { getProviderSummaries } from "#/infra/database/provider.repository";
import { ProvidersView } from "./_components/providers-view";

export const metadata: Metadata = {
  title: "Providers | Oh My AI Gateway",
};

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const providers = await getProviderSummaries();

  return <ProvidersView providers={providers} />;
}
