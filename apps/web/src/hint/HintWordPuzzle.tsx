import { useState } from "react";

interface HintWordPuzzleProps {
  words: string[];
  onInsert: (word: string) => void;
}

export function HintWordPuzzle({ words, onInsert }: HintWordPuzzleProps) {
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());

  return (
    <div className="hint-puzzle" data-testid="hint-puzzle">
      <div className="hint-puzzle__words">
        {words.map((word, i) => (
          <button
            key={i}
            type="button"
            className="hint-word"
            data-testid={`hint-word-${i}`}
            disabled={usedIndices.has(i)}
            onClick={() => {
              onInsert(word);
              setUsedIndices((prev) => new Set(prev).add(i));
            }}
          >
            {word}
          </button>
        ))}
      </div>
      {usedIndices.size > 0 && (
        <button
          type="button"
          className="hint-puzzle__reset"
          data-testid="hint-puzzle-reset"
          onClick={() => setUsedIndices(new Set())}
        >
          リセット
        </button>
      )}
    </div>
  );
}
