export interface ColumnSchema {
  name: string;
  type: string;
}

export interface TableSchema {
  table: string;
  columns: ColumnSchema[];
}

export function parseSchema(statements: string[]): TableSchema[] {
  return statements.flatMap((statement) => {
    const match = statement.match(/CREATE TABLE\s+(\w+)\s*\(([^)]*)\)/i);
    if (!match) return [];

    const [, table, columnList] = match;
    const columns = columnList.split(",").map((column) => {
      const [name, ...typeParts] = column.trim().split(/\s+/);
      return { name, type: typeParts.join(" ") };
    });

    return [{ table, columns }];
  });
}
