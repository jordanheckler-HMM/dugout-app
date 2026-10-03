# Dugout distribution and program plan

## Current product boundary

Dugout is a single-installation, local-first coaching app. Its Tauri host starts
a FastAPI sidecar on loopback; the sidecar stores one set of roster, lineup,
field, schedule, and stat JSON files in the app data directory. The desktop UI
does not use Lyra. There is no account, automatic backup, cross-device sync,
program membership, or Bench Coach connection.

Pull requests build unsigned macOS and Windows preview artifacts. The release
workflow prepares **draft** GitHub releases from a version-matched tag.
An installer is deliverable only after the corresponding CI build and an
installed-app smoke check succeed. The workflow applies an ad-hoc macOS
signature, but updater and ad-hoc signatures do not provide Apple Developer ID
notarization or Windows Authenticode signatures.

## Release gates for a downloadable local edition

1. Check the Windows and macOS installers on fresh machines: first launch,
   sidecar startup, roster creation, lineup save/reload, game stats, app exit,
   and relaunch with the same data.
2. Provide an in-app backup and restore flow, with a clear location and version
   for the exported data. Until then, a coach must manually back up the app
   data directory.
3. Resolve or explicitly triage dependency advisories in the shipped runtime
   and build chain; validate the resulting installers again.
4. Configure operating-system code signing and macOS notarization before
   presenting downloads as a polished commercial release.
5. Document what local player data is stored, how a coach removes it, and how
   support receives diagnostic information without taking roster data.

## Program edition using HYMetaLab Supabase

The HYMetaLab project can host a later program service, but existing Bench Coach
and generic team tables are not a Dugout tenant model. Add a dedicated Dugout
schema with program, membership, team, player, lineup, game, and stat ownership.
Every child record must be scoped to a program, and Row Level Security must
enforce membership for every read and write. The desktop client must use a
coach's authenticated session; it must never contain a Supabase service-role
key. Define invitation, removal, role, backup, and conflict behavior before
enabling sync. A local-first sync protocol also needs durable record IDs,
revision tracking, and explicit conflict resolution; simply replacing JSON
storage with cloud tables would risk lost updates.

This is a proposed architecture, not a deployed database migration.

## Bench Coach MCP extension point

Start with an optional practice brief action. Show the coach the exact fields
before sending: age tier, player count, duration, and optional goals or
constraints. Do not send player names, jersey numbers, notes, or individual
stats in that first integration. Treat the returned brief as a coach-reviewed
draft. Persistent team history requires Bench Coach's authenticated history
service, which is separate from its current public brief tools.

This is an integration plan. Dugout does not currently call Bench Coach MCP.
