# ADOLens

A desktop application for comparing, synchronizing, and editing **Azure DevOps Variable Groups** between different projects or pipelines using a high-performance split-screen interface.

## Features

| Feature | Details |
|---|---|
| **Secure Auth** | PAT stored in OS keychain via `keyring`; org URL persisted with `tauri-plugin-store` |
| **Split-Screen Diff** | Left (Source) vs Right (Target) panes with synchronized scrolling |
| **Visual Diff Engine** | Identical / Modified (amber) / Added (green) / Removed (red) / Ghost rows for alignment |
| **Inline Editing** | Double-click any value cell to edit in-place |
| **Copy Actions** | Per-row copy button (← →) + Bulk Sync All |
| **Secret Handling** | Secrets shown as `••••••••` — comparison skipped, overwrite allowed |
| **Review Modal** | Before/After diff summary before committing via ADO REST API PUT |
| **Keyboard Shortcuts** | `Ctrl+F` to search keys, `Escape` to cancel edit |
| **Resizable Panels** | Draggable sidebar and comparison panes |
| **Clone Library** | Clone a variable group to a new name within the same project |

## Tech Stack

- **Tauri 2** — Rust backend + WebView2 frontend, custom frameless window
- **React 19 + TypeScript** (strict mode)
- **Tailwind CSS v4** — Dark mode by default
- **Zustand** — UI state (sidebar, pane selections)
- **TanStack Query v5** — Server state (ADO API fetching/caching)
- **react-resizable-panels v4** — 3-pane resizable layout
- **lucide-react** – Iconography, **sonner** – Toasts, **framer-motion** – Transitions
- **azure_devops_rust_api** – ADO REST API client (Rust backend)

## Getting Started

```bash
pnpm install
pnpm dev             # Launch Tauri dev window (Vite + Rust hot-reload)
pnpm build           # Production build + bundle
```

## Usage

1. **Login** – Enter your org URL (`https://dev.azure.com/your-org`) and a PAT (Read & Write on Library/Variable Groups).
2. **Select Groups** – Expand a project in the sidebar, click **L** or **R** to load into Source/Target.
3. **Compare** – Diff highlights differences immediately. Toggle **Sync Scroll** to keep panes aligned.
4. **Edit** – Double-click any value to edit inline. `Enter` to confirm, `Escape` to cancel.
5. **Sync** – Use **→** / **←** per-row buttons or **Sync All** for bulk operations.
6. **Commit** – Click **Review & Commit**, inspect changes, then push to Azure DevOps.

## Security

PATs are stored securely in the **OS keychain** via the `keyring` crate. All ADO API calls run in the Rust backend process. The frontend communicates via Tauri's typed `invoke` IPC.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
