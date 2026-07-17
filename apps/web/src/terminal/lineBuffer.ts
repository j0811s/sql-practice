export type LineBufferEvent =
  | { type: "printable"; char: string }
  | { type: "backspace" }
  | { type: "enter" };

export interface LineBufferResult {
  buffer: string;
  echo: string;
  submittedLine?: string;
}

export function reduceLineBuffer(buffer: string, event: LineBufferEvent): LineBufferResult {
  switch (event.type) {
    case "printable":
      return { buffer: buffer + event.char, echo: event.char };
    case "backspace":
      if (buffer.length === 0) {
        return { buffer, echo: "" };
      }
      return { buffer: buffer.slice(0, -1), echo: "\b \b" };
    case "enter":
      return { buffer: "", echo: "\r\n", submittedLine: buffer };
  }
}

export function toLineBufferEvent(data: string): LineBufferEvent | null {
  if (data === "\r") return { type: "enter" };
  if (data === "\x7f") return { type: "backspace" };
  if (data.length === 1 && data >= " ") return { type: "printable", char: data };
  return null;
}
