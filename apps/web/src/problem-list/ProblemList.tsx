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
      {problems.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            aria-current={p.id === selectedId}
            data-testid={`problem-item-${p.id}`}
          >
            {completedIds.includes(p.id) ? "✓ " : ""}
            {p.title}
          </button>
        </li>
      ))}
    </ul>
  );
}
