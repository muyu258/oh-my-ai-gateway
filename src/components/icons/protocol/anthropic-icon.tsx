import { SiAnthropic } from "react-icons/si";

import type { ProtocolBrandIconProps } from "./protocol-icon.types";

export function AnthropicIcon({ className, size = 18 }: ProtocolBrandIconProps) {
  return <SiAnthropic className={className} size={size} aria-hidden="true" />;
}
