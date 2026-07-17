import { describe, expect, it } from "vitest";
import { reduceLineBuffer, toLineBufferEvent } from "./lineBuffer";

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

  it("ignores control sequences such as arrow keys", () => {
    expect(toLineBufferEvent("\x1b[A")).toBeNull();
  });
});
