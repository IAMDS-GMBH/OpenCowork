# Copilot Instructions for Open Cowork

Open Cowork is an Electron desktop application (Windows/macOS) that wraps AI models (Claude, OpenAI, Gemini, DeepSeek, etc.) into a GUI with sandbox isolation, a built-in Skills system, MCP connectors, and remote control via Feishu/Slack.

## Build, Test, and Lint

```bash
# Development
npm install          # also downloads Node binaries and rebuilds native modules
npm run dev          # start Vite + Electron dev server

# Testing
npm run test                    # Vitest in watch mode
npx vitest run                  # single run (used in CI)
npx vitest run --coverage       # with v8 coverage report
npx vitest run -t "test name"   # run a single test by name

# Quality
npm run lint         # ESLint over src/**/*.{ts,tsx}
npm run format       # Prettier write
npx tsc --noEmit     # type-check without emitting

# Build
npm run build        # full production build (macOS/Windows)
npm run clean        # remove all dist/ and build artifacts
```

CI requires lint, type-check, and `npx vitest run` to pass before merge.

## Architecture

Three Electron process layers communicate via IPC:

```
src/main/        — Electron main process (Node.js)
src/preload/     — Context bridge (exposes window.electronAPI to renderer)
src/renderer/    — React + Tailwind UI
src/shared/      — Types and utilities importable by both main and renderer (NO Electron imports)
```

**Main process** (`src/main/index.ts`) is the central IPC hub (~60 handlers namespaced as `config.*`, `mcp.*`, `session.*`, `sandbox.*`, `logs.*`, `remote.*`, `schedule.*`). It owns:

- `session/session-manager.ts` — session CRUD, chat history
- `claude/agent-runner.ts` — AI agent execution via `@mariozechner/pi-coding-agent`
- `config/config-store.ts` — persistent settings (`electron-store`)
- `db/database.ts` — SQLite persistence (`better-sqlite3`)
- `mcp/mcp-manager.ts` — MCP server lifecycle (stdio / SSE / Streamable HTTP)
- `sandbox/sandbox-adapter.ts` — Lima (macOS) / WSL2 (Windows) isolation
- `skills/skills-manager.ts` — skill discovery and hot-reload
- `remote/remote-manager.ts` — Feishu/Lark + Slack remote control
- `extensions/` — `AgentRuntimeExtension` interface for extending agent lifecycle

**Renderer** uses Zustand for state (`src/renderer/store/index.ts`) and communicates with main exclusively through `window.electronAPI` (sent as typed `ClientEvent` / `ServerEvent` objects defined in `src/renderer/types/index.ts`).

**Shared IPC contract**: Main-process-only types that the renderer needs are mirrored in `src/shared/ipc-types.ts`. Never import from `src/main/` in the renderer or preload.

**Sandbox isolation**: Commands route through `sandbox-adapter.ts` — WSL2 on Windows, Lima VM (`claude-sandbox`) on macOS, native with path guards as fallback. All file operations are restricted to the user's chosen workspace folder.

**Skills**: Built-in skills live in `.claude/skills/` (pptx, docx, pdf, xlsx, skill-creator). Skills are discovered and hot-reloaded by `SkillsManager`.

## Key Conventions

**TypeScript**
- Strict mode, no implicit `any`. Use `unknown` + type guards instead of `any`. `catch (e: unknown)` is correct; `catch (e: any)` will be rejected in review.
- Path aliases: `@` → `src/`, `@main` → `src/main/`, `@renderer` → `src/renderer/`

**React / UI**
- Functional components with hooks only — no class components.
- Tailwind CSS for all styling — no CSS modules, no inline style objects unless unavoidable.
- Icons: use `lucide-react` exclusively — do not add other icon libraries.
- Component files must stay under **500 lines**; split into sub-components when larger.

**i18n**
- All user-visible strings must go through `i18next` — never hard-code display text.
- Translation files live in `src/renderer/i18n/`. Add keys to both `en` and `zh` when introducing new UI text.

```tsx
// Correct
const { t } = useTranslation();
return <button>{t('settings.save')}</button>;
```

**Testing**
- Test files live next to source **or** under a mirrored path:
  - `src/main/mcp/mcp-manager.ts` → `src/tests/mcp/mcp-manager.test.ts`
- Both `src/**/*.{test,spec}.ts` and `tests/**/*.{test,spec}.ts` are picked up automatically.
- `electron` is mocked at `tests/mocks/electron.ts` — do not import real Electron in tests.
- Tests required for every `feat` and `fix` PR.

**Git workflow**
- Target branch: `dev` for all feature/fix PRs; `main` for releases only.
- Conventional Commits enforced by commitlint + husky:
  ```
  feat(mcp): add Streamable HTTP transport support
  fix(sandbox): handle WSL2 path with spaces
  ```
  Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `chore`, `ci`, `style`, `revert`, `release`, `merge`. Header max: **100 chars**.

**Dependencies**
- License must be MIT, Apache-2.0, BSD, or ISC. No GPL/AGPL/SSPL.
- ESM-only packages (`@mariozechner/pi-coding-agent`, `@mariozechner/pi-ai`, `electron-store`, `uuid`) **must stay bundled** in the Vite build — CJS `require()` cannot load them. CJS-compatible packages are externalized in `vite.config.ts`.
- Critical dependencies requiring extra care on updates: `electron`, `@mariozechner/pi-coding-agent`, `better-sqlite3` (native module, needs `npm run rebuild`), `vite`/`@vitejs/plugin-react`.
