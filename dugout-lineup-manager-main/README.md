# Dugout Frontend

Frontend application for Dugout, built with React, Vite, TypeScript, and Tauri.

## What This App Does

- Manage player roster data
- Build batting lineups and defensive field assignments
- Save and load lineup configurations
- Manage game schedule and game-level stats
- Check and install desktop app updates (Tauri updater; desktop runtime only)

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Zustand + TanStack Query
- Tauri 2 (desktop packaging)

## Prerequisites

- Node.js 20+
- npm
- Backend API running at `http://localhost:8100`

For Tauri development/builds:

- Rust toolchain
- Platform prerequisites from Tauri docs
- A backend sidecar binary (see `build:sidecar`)

## Local Development

```bash
cd dugout-lineup-manager-main
npm install
npm run dev
```

Vite is configured for:

- URL: `http://localhost:8123`
- Strict port: enabled

## Backend Integration

The frontend uses a typed client in `src/api/client.ts`.

Current API base URL:

- `http://localhost:8100` (hardcoded as `API_BASE`)

If backend host/port changes, update `API_BASE` in `src/api/client.ts`.

## Available Scripts

- `npm run dev`: Start Vite development server
- `npm run build`: Production web build
- `npm run build:dev`: Development-mode web build
- `npm run lint`: ESLint checks
- `npm run test`: Run Vitest in watch mode
- `npm run test:run`: Run Vitest once
- `npm run tauri`: Run Tauri CLI commands
- `npm run build:sidecar`: Build Python backend sidecar binary for Tauri

## Test and Quality Commands

```bash
npm run lint
npm run test:run
```

## Tauri Notes

For local desktop development:

```bash
npm run tauri dev
```

For desktop packaging:

- Build the backend sidecar first: `npm run build:sidecar`
- `build_dugout.sh` reads Tauri updater signing values from the environment and
  builds the bundle; it does not build the sidecar binary or sign the operating-
  system installer

For production desktop builds, ensure sidecar/backend packaging is set up
first, then run `npm run tauri build` on the target operating system. The
GitHub Actions release workflow builds macOS, Windows, and Linux bundles from
a `v*` tag and publishes the matching release after the build matrix succeeds.

## Runtime Side Effects

- In Tauri desktop runtime, the app attempts to launch a backend sidecar and
  sets `DUGOUT_DATA_DIR` to Dugout's operating-system app data directory for
  that sidecar process. This directory contains the local roster and game JSON
  files. It is not synchronized across installations.
- The Lyra UI is not mounted. Existing backend AI routes remain for compatibility
  but are not required for the desktop workflow.

## Related Docs

- `../README.md` (repo overview)
- `BACKEND_INTEGRATION.md`
- `../QUICK_START.md`
- `../TESTING.md`
