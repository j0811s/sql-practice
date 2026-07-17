import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { reduceLineBuffer, toLineBufferEvent } from "./lineBuffer";

const PROMPT = "sql> ";

interface TerminalViewProps {
  onSubmit: (sql: string) => void;
}

export function TerminalView({ onSubmit }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({ cursorBlink: true, convertEol: true });
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

    return () => {
      disposable.dispose();
      term.dispose();
    };
  }, [onSubmit]);

  return <div ref={containerRef} style={{ height: "300px" }} />;
}
