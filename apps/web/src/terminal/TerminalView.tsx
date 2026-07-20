import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { reduceLineBuffer, toLineBufferEvent } from "./lineBuffer";

const PROMPT = "sql> ";

const FONT_MONO =
  '"SF Mono", "JetBrains Mono", "IBM Plex Mono", ui-monospace, Menlo, Consolas, "Cascadia Code", monospace';

const THEME = {
  background: "#0f1115",
  foreground: "#e7e9ee",
  cursor: "#6d93ff",
  cursorAccent: "#0f1115",
  selectionBackground: "rgba(109, 147, 255, 0.35)",
  black: "#0f1115",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#e3a34e",
  blue: "#6d93ff",
  magenta: "#c084fc",
  cyan: "#67e8f9",
  white: "#e7e9ee",
  brightBlack: "#3a3e4a",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#f2c185",
  brightBlue: "#93b4ff",
  brightMagenta: "#d8b4fe",
  brightCyan: "#a5f3fc",
  brightWhite: "#ffffff",
};

interface TerminalViewProps {
  onSubmit: (sql: string) => void;
}

export function TerminalView({ onSubmit }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: FONT_MONO,
      fontSize: 14,
      lineHeight: 1.5,
      theme: THEME,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    term.write(PROMPT);

    let buffer = "";
    const disposable = term.onData((data) => {
      const event = toLineBufferEvent(data);
      if (!event) return;

      const result = reduceLineBuffer(buffer, event);
      buffer = result.buffer;
      term.write(result.echo);

      if (result.submittedLine !== undefined) {
        onSubmit(result.submittedLine);
        term.write(PROMPT);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      disposable.dispose();
      term.dispose();
    };
  }, [onSubmit]);

  return <div ref={containerRef} className="terminal-surface" />;
}
