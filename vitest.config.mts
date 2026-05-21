import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Resolve Electron and better-sqlite3 to stable test doubles.
    // better-sqlite3 is compiled for Electron and cannot load under system Node.js;
    // the mock wraps Node's built-in node:sqlite (DatabaseSync) instead.
    alias: {
      electron: path.resolve(import.meta.dirname, './tests/mocks/electron.ts'),
      'better-sqlite3': path.resolve(import.meta.dirname, './tests/mocks/better-sqlite3.ts'),
    },
    server: {
      deps: {
        inline: ['electron-store'],
      },
    },
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'dist-electron', '.claude'],
    coverage: {
      provider: 'v8',
      // text: human-readable table in CI logs; json-summary: machine-readable for badge tools
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'dist-electron/',
        'src/renderer/',
        'src/tests/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
      thresholds: {
        lines: 30,
        functions: 35,
        branches: 28,
        statements: 30,
      },
    },
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
