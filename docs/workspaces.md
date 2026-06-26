# Workspaces

Each workspace is an independent filesystem root and Git repository.

## Stored Metadata

- `id`
- `name`
- `path`
- `createdAt`
- `lastOpenedAt`

## Supported Actions

- Create workspace
- Open workspace
- Rename workspace
- Delete workspace
- Switch workspace

## Important Rule

Workspace creation and workspace switching do **not** create Git commits.

Commit history starts when content mutations happen.

## Per-Workspace UI Persistence

GitPad restores these per workspace:

- open tabs
- active tab/file
- explorer selection
- sidebar collapsed state
