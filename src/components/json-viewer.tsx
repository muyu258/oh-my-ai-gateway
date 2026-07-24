"use client";

import JsonView from "@uiw/react-json-view";
import { vscodeTheme } from "@uiw/react-json-view/vscode";

export function JsonViewer({ value, className }: { value: object; className?: string }) {
  return (
    <JsonView
      value={value}
      collapsed={2}
      displayDataTypes={false}
      enableClipboard={false}
      highlightUpdates={false}
      shortenTextAfterLength={0}
      className={className}
      style={{
        ...vscodeTheme,
        backgroundColor: "transparent",
        fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "12px",
        lineHeight: "24px",
      }}
    />
  );
}
