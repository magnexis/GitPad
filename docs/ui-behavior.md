# UI Behavior

## Explorer

- Single click selects and opens file nodes.
- Folder chevron toggles expansion only.
- Right-click opens context menu with real filesystem actions.
- Deleting nodes prompts for confirmation.
- Hover/focus states and tooltips are consistent for icon actions.

## Editor

- Dirty indicators show unsaved tabs.
- Save actions are explicit (`Save` / `Save All`).
- Tab menu supports close, close others, and close all.
- Reopen closed tab restores recent tab state.

## Command Surfaces

- Command palette (`Ctrl+K`) executes categorized actions.
- Quick open (`Ctrl+P`) is file-centric and optimized for keyboard use.
- Prompt and confirmation modals are in-app dialogs (no browser `prompt/confirm`).

## Feedback

- Operation notices surface in top bar.
- Validation and backend errors surface as non-fatal notices.
