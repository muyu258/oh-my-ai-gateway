import { RiOpenaiFill } from "react-icons/ri";

import type { ProtocolBrandIconProps } from "./protocol-icon.types";

export function OpenaiCompatibleIcon({ className, size = 18 }: ProtocolBrandIconProps) {
  return <RiOpenaiFill className={className} size={size} aria-hidden="true" />;
}
