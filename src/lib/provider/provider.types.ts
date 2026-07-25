import type { ProviderRecord } from "#/lib/database/drizzle/schema";
import type { ProtocolType } from "../protocol/protocol.types";

export type Provider = ProviderRecord;

export type ProviderProtocols = ProviderRecord["protocols"];

export type ProviderProtocolConfig = NonNullable<ProviderProtocols[ProtocolType]>;
