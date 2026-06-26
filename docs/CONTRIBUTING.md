# Contributing to GitPad

## Setup

```bash
npm install
npm run dev
```

## Build and Tests

```bash
npm run build
npm test
```

## Engineering Rules

- No placeholder UI controls.
- Every visible action must call real logic.
- Workspace creation must not create commits.
- File/folder mutations must update filesystem, UI state, and history.
- Keep GitHub/VS Code style: restrained dark UI, clear hierarchy, minimal clutter.

## PR Checklist

- [ ] Explorer actions work (create, rename, duplicate, delete, move, open).
- [ ] Editor works (open, edit, dirty, save, tab management).
- [ ] Command palette and quick open execute real actions.
- [ ] Commit history behavior remains correct.
- [ ] Tooltips exist on interactive controls.
- [ ] Build passes and tests pass.
