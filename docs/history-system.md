# History System

## Commit Rules

### Not commit-worthy

- Creating/opening/switching workspaces
- Theme or UI setting changes
- Selecting files/folders
- Explorer expand/collapse

### Commit-worthy

- Any staged file/folder change that is included in an explicit commit:
  - create
  - update
  - rename/move
  - duplicate
  - delete

## Entry Shape

History entries are Git commits and expose:

- hash and short hash
- author
- timestamp
- commit summary
- changed files list
- diff text

## UI Behavior

- History list supports filtering by intent (files/folders/edits/creates/deletes/renames).
- Selecting a commit opens details.
- Per-file restore and commit revert actions are available from details.
- History updates per active branch context.
