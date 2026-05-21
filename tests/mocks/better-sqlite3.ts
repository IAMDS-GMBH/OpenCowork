/**
 * Pure-JS mock for better-sqlite3 using Node's built-in node:sqlite.
 * Avoids the native module NODE_MODULE_VERSION mismatch when tests run
 * under system Node.js while better-sqlite3 is compiled for Electron.
 *
 * Only implements the API surface used by the memory test suite.
 */
import { DatabaseSync, StatementSync } from 'node:sqlite';

class MockStatement {
  constructor(private readonly stmt: StatementSync) {}

  get(...args: unknown[]): unknown {
    return (this.stmt.get as (...a: unknown[]) => unknown)(...args) ?? undefined;
  }

  all(...args: unknown[]): unknown[] {
    return (this.stmt.all as (...a: unknown[]) => unknown[])(...args);
  }

  run(...args: unknown[]): { changes: number; lastInsertRowid: number | bigint } {
    return (this.stmt.run as (...a: unknown[]) => { changes: number; lastInsertRowid: number | bigint })(...args);
  }
}

class MockDatabase {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
  }

  exec(sql: string): this {
    this.db.exec(sql);
    return this;
  }

  prepare(sql: string): MockStatement {
    return new MockStatement(this.db.prepare(sql));
  }

  close(): void {
    this.db.close();
  }
}

export default MockDatabase;
