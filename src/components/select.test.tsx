import { describe, expect, test } from "bun:test";
import { CalendarRange } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

import { Select } from "./select";

const options = [
  { label: "Last hour", value: "1h" },
  { label: "Last day", value: "24h" },
] as const;

describe("Select", () => {
  test("renders the selected value and accessible label", () => {
    const markup = renderToStaticMarkup(
      <Select
        ariaLabel="Statistics period"
        options={options}
        value="24h"
        onValueChange={() => {}}
      />,
    );

    expect(markup).toContain('aria-label="Statistics period"');
    expect(markup).toContain("Last day");
    expect(markup).toContain("ml-auto");
  });

  test("renders disabled state and a leading icon", () => {
    const markup = renderToStaticMarkup(
      <Select
        ariaLabel="Statistics period"
        disabled
        icon={<CalendarRange data-testid="period-icon" />}
        options={options}
        value="1h"
        onValueChange={() => {}}
      />,
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain('data-testid="period-icon"');
  });

  test("supports an empty string option value", () => {
    const markup = renderToStaticMarkup(
      <Select
        ariaLabel="Protocol"
        options={[
          { label: "All protocols", value: "" },
          { label: "OpenAI", value: "openai" },
        ]}
        value=""
        onValueChange={() => {}}
      />,
    );

    expect(markup).toContain("All protocols");
  });
});
