# Version Control

GitPad uses real Git commands per workspace repository.

## Commit Rules

- Creating/opening/switching/renaming/deleting a workspace is not a commit.
- Commits are created only through the staged commit flow.
- A commit requires:
  - at least one staged change
  - a non-empty commit message

## Change States

- `U` untracked
- `M` modified
- `S` staged
- `C` conflicted

These states are shown in the explorer and source control panel.

## Source Control Flow

1. Edit files from explorer/editor.
2. Stage selected files or stage all.
3. Enter commit message.
4. Commit staged changes.
5. Push/pull from GitHub if remote is configured.

## Diff Modes

- unstaged: working tree vs index
- staged: index vs HEAD
- working-vs-head: current file vs last commit
