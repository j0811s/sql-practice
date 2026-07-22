import type { Problem } from "@sql-practice/shared";

interface ProblemListProps {
  problems: Problem[];
  selectedId: number;
  completedIds: number[];
  onSelect: (id: number) => void;
}

export function ProblemList({ problems, selectedId, completedIds, onSelect }: ProblemListProps) {
  return (
    <ul data-testid="problem-list">
      {problems.map((p, i) => (
        <li key={p.id} className="problem-row">
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            aria-current={p.id === selectedId}
            data-testid={`problem-item-${p.id}`}
            className="problem-btn"
          >
            <span className="glyph">{completedIds.includes(p.id) ? "✓" : ""}</span>
            <span className="index">{String(i + 1).padStart(2, "0")}</span>
            <span className="title">{p.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
