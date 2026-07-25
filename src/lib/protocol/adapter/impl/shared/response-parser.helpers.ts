import { createParser } from "eventsource-parser";

type ParsedJson = ReturnType<typeof JSON.parse>;

export const consumeJsonEventStream = async (
  response: Response,
  onEvent: (data: ParsedJson) => void,
): Promise<void> => {
  const reader = response.body?.getReader();
  if (!reader) return;

  const parser = createParser({
    onEvent(event) {
      if (event.data === "[DONE]") return;
      onEvent(JSON.parse(event.data));
    },
  });
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value, { stream: true }));
  }
};
