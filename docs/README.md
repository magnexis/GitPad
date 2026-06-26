# GitPad

GitPad is a local-first desktop workspace for notes, documents, and code. Each workspace is a real Git repository. The desktop backend owns filesystem access, Git operations, terminal commands, and encrypted GitHub token storage.

## Features

- Create or open multiple workspaces.
- Initialize every workspace as a Git repository.
- Create, rename, delete, drag, and drop files in the explorer.
- Edit Markdown, text, JavaScript, TypeScript, JSON, CSS, shell, and other text files.
- Save active file or save all open tabs.
- Search full text across workspace files with line previews.
- Use branch + staging workflow, then commit staged changes with messages.
- View commit history, inspect diffs, restore files from commits, and revert commits.
- Run shell and Git commands in the integrated terminal.
- Link a GitHub repository with an encrypted local token, then pull and push.
- Configure theme, Git identity, default workspace location, and GitHub auto-push.
- Open Ctrl+K command palette for common actions.
- Link notes with `[[Note Name]]`; missing notes are created when opened.
- Backlinks show which notes reference the active note.
- Graph view renders real Markdown links as nodes and edges with zoom and scroll pan.
- Advanced fuzzy search filters by file type, date, and tag, with highlighted matches.
- Tags are parsed from note text with `#tag` syntax and surfaced in the dashboard.
- Side-by-side Git diff highlights added and removed lines.
- Named snapshots are stored as annotated Git tags and can be restored.
- Quick Capture appends to `quick/inbox.md`.
- Keyboard shortcuts: Ctrl+K command palette, Ctrl+N new note, Ctrl+P quick open, Ctrl+Shift+F search, Ctrl+Shift+N quick capture.

## Development

```bash
npm install
npm run dev
```

The Electron app starts after the Vite dev server and the compiled Electron main file are ready.

## Production Build

```bash
npm run build
npm start
```

## Tests

```bash
npm test
```

The backend tests create temporary repositories, commit files through the local Git executable, verify search, and check workspace path safety.

## Frontend Routes

GitPad uses hash routes inside the Electron renderer:

- `#/dashboard`
- `#/editor`
- `#/search`
- `#/graph`
- `#/history`
- `#/changes`
- `#/activity`
- `#/account`
- `#/snapshots`
- `#/terminal`
- `#/github`
- `#/settings`

## Security

GitHub tokens are never sent to the renderer after saving. They are encrypted in the Electron main process with `safeStorage` when available, then used only to construct one-time authenticated Git remotes for push and pull operations.

## Additional Docs

- [architecture.md](architecture.md)
- [features.md](features.md)
- [shortcuts.md](shortcuts.md)
- [history-system.md](history-system.md)
- [version-control.md](version-control.md)
- [branches.md](branches.md)
- [staging.md](staging.md)
- [sync.md](sync.md)
- [collaboration.md](collaboration.md)
- [permissions.md](permissions.md)
- [workspaces.md](workspaces.md)
- [ui-behavior.md](ui-behavior.md)
