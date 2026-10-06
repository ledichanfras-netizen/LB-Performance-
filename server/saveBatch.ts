import pg from 'pg';

/** Trusted SQL templates only. Values are escaped with the driver's literal encoder. */
export function createSaveBatch(client: {query: (sql: string) => Promise<any>}) {
  const statements: string[] = [];
  return {
    async query(sql: string, values: unknown[] = []) {
      if (!/^(INSERT|DELETE)\b/i.test(sql.trim())) throw new Error('Unsupported save statement');
      statements.push(sql.replace(/\$(\d+)\b/g, (_, index) => {
        if (Number(index) > values.length) throw new Error('Missing save parameter');
        const value = values[Number(index) - 1];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (typeof value === 'number' && Number.isFinite(value)) return String(value);
        if (typeof value === 'string') return pg.escapeLiteral(value);
        throw new Error('Invalid save parameter');
      }));
    },
    async flush() {
      // Keep the original operation order and the caller's transaction boundary.
      if (statements.length) await client.query(statements.join(';\n'));
      statements.length = 0;
    }
  };
}
