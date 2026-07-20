import { describe, expect, it } from "vitest";
import { reduceLineBuffer, replaceLineEcho, toLineBufferEvent } from "./lineBuffer";

describe("reduceLineBuffer", () => {
  it("appends printable characters to the buffer and echoes them", () => {
    const result = reduceLineBuffer("SELECT", { type: "printable", char: " " });
    expect(result).toEqual({ buffer: "SELECT ", echo: " " });
  });

  it("removes the last character on backspace", () => {
    const result = reduceLineBuffer("SELECT", { type: "backspace" });
    expect(result).toEqual({ buffer: "SELEC", echo: "\b \b" });
  });

  it("is a no-op when backspacing an empty buffer", () => {
    const result = reduceLineBuffer("", { type: "backspace" });
    expect(result).toEqual({ buffer: "", echo: "" });
  });

  it("submits the line and resets the buffer on enter", () => {
    const result = reduceLineBuffer("SELECT 1;", { type: "enter" });
    expect(result).toEqual({ buffer: "", echo: "\r\n", submittedLine: "SELECT 1;" });
  });

  it("appends pasted text to the buffer and echoes it verbatim", () => {
    const result = reduceLineBuffer("SELECT ", { type: "paste", text: "* FROM users;" });
    expect(result).toEqual({ buffer: "SELECT * FROM users;", echo: "* FROM users;" });
  });
});

describe("replaceLineEcho", () => {
  it("erases every character of the old buffer before writing the new line", () => {
    expect(replaceLineEcho("ab", "SELECT 1")).toBe("\b \b\b \bSELECT 1");
  });

  it("returns just the new line when the old buffer was empty", () => {
    expect(replaceLineEcho("", "SELECT 1")).toBe("SELECT 1");
  });
});

describe("toLineBufferEvent", () => {
  it("maps carriage return to enter", () => {
    expect(toLineBufferEvent("\r")).toEqual({ type: "enter" });
  });

  it("maps DEL to backspace", () => {
    expect(toLineBufferEvent("\x7f")).toEqual({ type: "backspace" });
  });

  it("maps a single printable character", () => {
    expect(toLineBufferEvent("a")).toEqual({ type: "printable", char: "a" });
  });

  it("maps the up arrow to history-prev", () => {
    expect(toLineBufferEvent("\x1b[A")).toEqual({ type: "history-prev" });
  });

  it("maps the down arrow to history-next", () => {
    expect(toLineBufferEvent("\x1b[B")).toEqual({ type: "history-next" });
  });

  it("ignores escape sequences it doesn't recognize", () => {
    expect(toLineBufferEvent("\x1b[C")).toBeNull();
  });

  it("maps multi-character input to a paste event", () => {
    expect(toLineBufferEvent("SELECT * FROM users;")).toEqual({
      type: "paste",
      text: "SELECT * FROM users;",
    });
  });

  it("collapses newlines in pasted text into spaces", () => {
    expect(toLineBufferEvent("SELECT 1\nFROM users")).toEqual({
      type: "paste",
      text: "SELECT 1 FROM users",
    });
  });

  it("trims a trailing newline from pasted text", () => {
    expect(toLineBufferEvent("SELECT 1;\n")).toEqual({ type: "paste", text: "SELECT 1;" });
  });

  it("ignores a paste that is empty after sanitizing", () => {
    expect(toLineBufferEvent("\n")).toBeNull();
  });
});
