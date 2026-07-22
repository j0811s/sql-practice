import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { LineBufferEvent, LineBufferResult } from "./lineBuffer";
import { reduceLineBuffer, replaceLineEcho, toLineBufferEvent } from "./lineBuffer";

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

export interface TerminalViewHandle {
  insertText: (text: string) => void;
}

export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(function TerminalView(
  { onSubmit },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const insertTextRef = useRef<(text: string) => void>(() => {});

  useImperativeHandle(ref, () => ({
    insertText: (text) => insertTextRef.current(text),
  }));

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
    let draft = "";
    const history: string[] = [];
    let historyIndex = 0;

    const applyEvent = (event: LineBufferEvent): LineBufferResult => {
      const result = reduceLineBuffer(buffer, event);
      buffer = result.buffer;
      term.write(result.echo);
      return result;
    };

    const disposable = term.onData((data) => {
      const event = toLineBufferEvent(data);
      if (!event) return;

      if (event.type === "history-prev" || event.type === "history-next") {
        if (event.type === "history-prev" && historyIndex > 0) {
          if (historyIndex === history.length) draft = buffer;
          historyIndex -= 1;
          term.write(replaceLineEcho(buffer, history[historyIndex]));
          buffer = history[historyIndex];
        } else if (event.type === "history-next" && historyIndex < history.length) {
          historyIndex += 1;
          const line = historyIndex === history.length ? draft : history[historyIndex];
          term.write(replaceLineEcho(buffer, line));
          buffer = line;
        }
        return;
      }

      const result = applyEvent(event);

      if (result.submittedLine !== undefined) {
        if (result.submittedLine.trim() !== "") {
          history.push(result.submittedLine);
        }
        historyIndex = history.length;
        draft = "";
        onSubmit(result.submittedLine);
        term.write(PROMPT);
      }
    });

    insertTextRef.current = (text) => {
      applyEvent({ type: "paste", text });
      term.focus();
    };

    term.attachCustomKeyEventHandler((event) => {
      const isCopyShortcut = (event.ctrlKey || event.metaKey) && event.code === "KeyC";
      if (event.type === "keydown" && isCopyShortcut && term.hasSelection()) {
        void navigator.clipboard.writeText(term.getSelection());
        return false;
      }
      return true;
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      insertTextRef.current = () => {};
      disposable.dispose();
      term.dispose();
    };
  }, [onSubmit]);

  return <div ref={containerRef} className="terminal-surface" />;
});
