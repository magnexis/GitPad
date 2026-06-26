# Changelog

## 1.0.1 - 2026-06-13

### Fixed
- Fixed hardcoded branch name in git operations; push/pull now correctly use the active branch
- Resolved issue where branch-specific operations always targeted `main` regardless of current checkout

## Phase 6

- Added local account system (register/login/logout/session persistence).
- Added user list and account view.
- Added activity feed service and panel for workspace/auth/git events.
- Added sync status model surfaced in top bar and source control panel.
- Hardened GitHub push/pull error handling for missing token or remote setup.

## Phase 5

- Added branch APIs and UI selector with create/switch support.
- Added staging model (staged/unstaged/conflicted) and source control workflow.
- Added staged commit flow with required commit message.
- Added discard file/all operations with confirmations.
- Added branch-aware source control diffs and basic merge action.
- Added explorer file-state badges (`U`, `M`, `S`, `C`).
- Added backend tests for no-commit branch workflows and staged commit rules.

## Phase 4

- Added quick open (`Ctrl+P`) with fuzzy file lookup and keyboard navigation.
- Expanded command palette (`Ctrl+K`) with categorized actionable commands.
- Added workspace operations: rename, delete, switch.
- Upgraded history panel with filtering and relative-time display.
- Improved explorer with filter input, context menu, collapse all, duplicate, and active highlighting.
- Improved editor tab management: close others, close all, reopen closed, save all.
- Added robust modal input/confirm flows (removed unsupported browser dialogs).
- Stabilized runtime error handling to surface actionable notices.
- Added backend validation for duplicate and invalid file/folder paths.

## Phase 3

- Wired explorer controls to real filesystem mutations.
- Wired editor read/write and tab operations to backend.
- Ensured workspace creation does not generate commit history entries.
- Implemented commit events for real file mutations.
- Implemented tooltips consistently across major controls.
- Added baseline command palette with executable actions.
- Added tests for backend repository and file behaviors.
