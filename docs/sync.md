# Sync

GitPad supports remote sync against GitHub remotes.

## Remote Setup

1. Open GitHub Sync view.
2. Save owner, repository, and token.
3. GitPad stores token encrypted in app data.

## Operations

- Push current branch state
- Pull with rebase
- Sync status indicator:
  - up-to-date
  - ahead
  - behind
  - diverged
  - no-upstream

If token/remote configuration is missing, push/pull returns a clear error in terminal output instead of throwing an uncaught exception.
