# Architecture

## High-Level

- **Electron main process**: registers IPC handlers, owns secure APIs, filesystem access, Git integration.
- **Backend modules**:
  - `backend/file-system`: workspace and tree/file operations.
  - `backend/git`: branch/staging/commit/history/diff/merge/snapshot operations.
  - `backend/commands`: IPC adapters, terminal, execution, GitHub, auth, activity services.
- **Renderer (React + Zustand)**:
  - `src/store/useGitPadStore.ts` is the central application state and action layer.
  - Feature UI modules in `src/components`, `src/editor`, `src/git`, `src/search`, `src/pages`.

## Data Flow

1. UI dispatches store action.
2. Store calls preload API (`window.gitpad.*`).
3. Preload forwards request via IPC.
4. Backend executes filesystem/Git command.
5. Store refreshes tree/history/derived panels and persists workspace UI state.

## Persistence Model

- Workspace/settings metadata: app data store (`gitpad-store.json`).
- Auth/session metadata: app data store (`auth-store.json`).
- Activity feed metadata: app data store (`activity-store.json`).
- Files and folders: real disk structure inside selected workspace root.
- Git history: repository commits/tags in each workspace.
- UI workspace session (tabs/active file/sidebar/selection): renderer localStorage per workspace path.
