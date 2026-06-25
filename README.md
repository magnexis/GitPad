# GitPad

[![Platform: Electron](https://img.shields.io/badge/Platform-Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Frontend: React + TypeScript](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-3178C6?logo=react&logoColor=white)](https://react.dev/)
[![Styling: Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F05032.svg)](docs/LICENSE)
[![npm](https://img.shields.io/npm/v/gitpad-2?style=flat-square&logo=npm)](https://www.npmjs.com/package/gitpad-2)

GitPad is a local-first desktop workspace for notes and code where each workspace is a real Git repository.

GitPad combines:

- a file explorer with real filesystem operations
- a multi-tab editor
- command palette and quick-open workflows
- integrated Git history, branches, staging, and diff inspection
- terminal and GitHub sync tools
- local account/session and activity feed foundations

## Core Behaviors

- Creating a workspace initializes a repository but does **not** create a commit.
- Commits are created from **staged changes** with an explicit commit message.
- Workspaces are isolated from each other (tree, tabs, history, settings state).
- Frontend (`src/*`) and backend (`backend/*`, `electron/*`) are separated by a typed IPC bridge.

## Feature Set

- Workspace lifecycle: create, open, switch, rename, delete.
- Explorer: create file/folder, rename, duplicate, delete, drag-drop move, filter, context menu, collapse all.
- Editor: open files, multi-tab editing, dirty indicators, save active, save all, close/close others/close all, reopen closed tab.
- Command palette (`Ctrl+K`) with actionable commands and categories.
- Quick open (`Ctrl+P`) for fuzzy file navigation.
- Search with advanced filters and “search inside results”.
- Source control panel with stage/unstage, discard, commit, branch-aware diffs, and merge.
- Git history panel with filtering, details, revert, restore, and diff views.
- Terminal integration for Git and shell commands.
- GitHub sync with encrypted token storage in desktop secure storage.
- Account/session panel and activity feed.

## Keyboard Shortcuts

- `Ctrl+K`: command palette
- `Ctrl+P`: quick open file
- `Ctrl+S`: save active file
- `Ctrl+W`: close active tab
- `Ctrl+B`: toggle explorer sidebar
- `Ctrl+Shift+F`: search
- `Ctrl+N`: new note
- `Ctrl+Shift+N`: quick capture

## Run Locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

Build artifacts are written to `target/`:

- `target/dist`
- `target/dist-electron`

Windows release executable:

```bash
npm run release:win
```

The installer `.exe` is generated in `target/release/`.

Tests:

```bash
npm test
```

## Containerization

GitPad includes Docker targets for dev, CI, and headless desktop runtime.

Build the CI image (runs tests + build):

```bash
docker build --target ci -t gitpad:ci .
```

Run renderer dev server in a container:

```bash
docker compose up renderer-dev
```

Run headless Electron startup in a container:

```bash
docker compose up desktop-headless
```

## Project Structure

```text
gitpad/
├── src/
│   ├── components/
│   ├── editor/
│   ├── git/
│   ├── pages/
│   ├── search/
│   ├── settings/
│   ├── store/
│   └── terminal/
├── backend/
│   ├── commands/
│   ├── file-system/
│   └── git/
├── electron/
├── docs/
└── tests/
```

## Screenshots

Screenshots will be added in a later update.

## Docs

- [Documentation Home](docs/README.md)
- [License](docs/LICENSE)
- [docs/features.md](docs/features.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/workspaces.md](docs/workspaces.md)
- [docs/history-system.md](docs/history-system.md)
- [docs/version-control.md](docs/version-control.md)
- [docs/branches.md](docs/branches.md)
- [docs/staging.md](docs/staging.md)
- [docs/sync.md](docs/sync.md)
- [docs/collaboration.md](docs/collaboration.md)
- [docs/permissions.md](docs/permissions.md)
- [docs/shortcuts.md](docs/shortcuts.md)
- [docs/ui-behavior.md](docs/ui-behavior.md)

## Roadmap

- Plugin system
- Collaboration
- Cloud sync
- AI-assisted notes
