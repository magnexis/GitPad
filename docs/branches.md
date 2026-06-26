# Branches

Each workspace repository maintains its own branch list.

## Supported Actions

- Create branch
- Switch branch
- Rename branch
- Delete branch (cannot delete active branch)

## Fresh Repository Behavior

Before the first commit, Git may not list branches with `git branch`.
GitPad resolves this by reading `HEAD` directly, so branch switching and creation still work in new workspaces.

## UI

- Top bar branch selector shows active branch and available branches.
- Source control panel reflects branch context for staging and history.
