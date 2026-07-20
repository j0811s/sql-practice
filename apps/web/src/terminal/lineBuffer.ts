export type LineBufferEvent =
  | { type: "printable"; char: string }
  | { type: "paste"; text: string }
  | { type: "backspace" }
  | { type: "enter" }
  | { type: "history-prev" }
  | { type: "history-next" };

export interface LineBufferResult {
  buffer: string;
  echo: string;
  submittedLine?: string;
}

export function reduceLineBuffer(buffer: string, event: LineBufferEvent): LineBufferResult {
  switch (event.type) {
    case "printable":
      return { buffer: buffer + event.char, echo: event.char };
    case "paste":
      return { buffer: buffer + event.text, echo: event.text };
    case "backspace":
      if (buffer.length === 0) {
        return { buffer, echo: "" };
      }
      return { buffer: buffer.slice(0, -1), echo: "\b \b" };
    case "enter":
      return { buffer: "", echo: "\r\n", submittedLine: buffer };
    case "history-prev":
    case "history-next":
      return { buffer, echo: "" };
  }
}

/** Erases the currently-echoed buffer character-by-character, then writes the replacement line. */
export function replaceLineEcho(oldBuffer: string, newLine: string): string {
  return "\b \b".repeat(oldBuffer.length) + newLine;
}

const BRACKETED_PASTE_START = "\x1b[200~";
const BRACKETED_PASTE_END = "\x1b[201~";

export function toLineBufferEvent(data: string): LineBufferEvent | null {
  if (data === "\r") return { type: "enter" };
  if (data === "\x7f") return { type: "backspace" };
  if (data === "\x1b[A") return { type: "history-prev" };
  if (data === "\x1b[B") return { type: "history-next" };

  if (data.startsWith(BRACKETED_PASTE_START)) {
    return toPasteEvent(data.slice(BRACKETED_PASTE_START.length, data.length - BRACKETED_PASTE_END.length));
  }

  if (data.startsWith("\x1b")) return null;
  if (data.length === 1 && data >= " ") return { type: "printable", char: data };
  if (data.length > 1) return toPasteEvent(data);
  return null;
}

function toPasteEvent(raw: string): LineBufferEvent | null {
  const sanitized = Array.from(raw.replace(/[\r\n]+/g, " "))
    .filter((char) => char >= " ")
    .join("")
    .trim();
  return sanitized.length > 0 ? { type: "paste", text: sanitized } : null;
}
