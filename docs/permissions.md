# Permissions

Current permission model is foundational and local-first.

## Roles (Data Model)

- owner
- editor
- viewer

These roles are defined in shared types for future enforcement in synced multi-user workspaces.

## Current Enforcement Scope

The desktop app currently runs as a local user session with full workspace access.
Role-based UI/API enforcement is the next step for shared cloud workspaces.
