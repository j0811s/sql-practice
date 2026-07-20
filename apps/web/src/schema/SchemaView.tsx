import type { TableSchema } from "./parseSchema";

interface SchemaViewProps {
  tables: TableSchema[];
}

function keyKind(columnName: string): "pk" | "fk" | null {
  if (columnName === "id") return "pk";
  if (columnName.endsWith("_id")) return "fk";
  return null;
}

export function SchemaView({ tables }: SchemaViewProps) {
  return (
    <div className="schema-view">
      {tables.map((t) => (
        <div className="schema-table" key={t.table}>
          <p className="schema-table__name">{t.table}</p>
          <ul className="schema-table__columns">
            {t.columns.map((c) => {
              const kind = keyKind(c.name);
              return (
                <li key={c.name} className="schema-col">
                  <span className={kind ? `schema-col__name schema-col__name--${kind}` : "schema-col__name"}>
                    {c.name}
                  </span>
                  <span className="schema-col__type">{c.type}</span>
                  {kind && <span className={`schema-col__badge schema-col__badge--${kind}`}>{kind.toUpperCase()}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
