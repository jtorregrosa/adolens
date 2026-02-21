# ADO Lens

A professional Electron desktop application for comparing, synchronizing, and editing **Azure DevOps Variable Groups** between different projects or pipelines using a high-performance split-screen interface.

## Features

| Feature | Details |
|---|---|
| **Secure Auth** | PAT encrypted via Electron `safeStorage`, org URL in `electron-store` |
| **Split-Screen Diff** | Left (Source) vs Right (Target) panes with synchronized scrolling |
| **Visual Diff Engine** | Identical / Modified (amber) / Added (green) / Removed (red) / Ghost rows for alignment |
| **Inline Editing** | Double-click any value cell to edit in-place |
| **Copy Actions** | Per-row copy button (← →) + Bulk Sync All |
| **Secret Handling** | Secrets shown as `••••••••` — comparison skipped, overwrite allowed |
| **Review Modal** | Before/After diff summary before committing via ADO REST API PUT |
| **Keyboard Shortcuts** | `Ctrl+F` to search keys, `Escape` to cancel edit |
| **Resizable Panels** | Draggable sidebar and comparison panes |

## Tech Stack

- **Electron 39** — Main/Renderer separation via `contextBridge`
- **React 18 + TypeScript** (strict mode)
- **Tailwind CSS v4** — Dark mode by default
- **Zustand** — UI state (sidebar, pane selections)
- **TanStack Query v5** — Server state (ADO API fetching/caching)
- **react-resizable-panels v4** — 3-pane resizable layout
- **lucide-react** – Iconography, **sonner** – Toasts, **framer-motion** – Transitions
- **azure-devops-node-api** – ADO REST API client (main process)

## Getting Started

```bash
npm install
npm run dev          # Launch dev server + Electron
npm run build        # Typecheck + production build
npm run build:win    # Windows installer
```

## Usage

1. **Login** – Enter your org URL (`https://dev.azure.com/your-org`) and a PAT (Read & Write on Library/Variable Groups).
2. **Select Groups** – Expand a project in the sidebar, click **L** or **R** to load into Source/Target.
3. **Compare** – Diff highlights differences immediately. Toggle **Sync Scroll** to keep panes aligned.
4. **Edit** – Double-click any value to edit inline. `Enter` to confirm, `Escape` to cancel.
5. **Sync** – Use **→** / **←** per-row buttons or **Sync All** for bulk operations.
6. **Commit** – Click **Review & Commit**, inspect changes, then push to Azure DevOps.

## Security

PATs are encrypted via Electron `safeStorage` (OS keychain). All ADO API calls run in the main process. The renderer only communicates via typed `contextBridge` IPC channels.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
