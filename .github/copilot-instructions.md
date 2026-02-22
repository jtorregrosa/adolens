# ADOLens - Workspace Instructions

## Tech Stack
- **Runtime**: Tauri 2 (Rust backend + WebView2 renderer, frameless window)
- **Frontend**: React 19 + TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (dark mode by default, `@tailwindcss/vite` plugin)
- **State**: Zustand (UI) + TanStack Query v5 (server state)
- **Layout**: `react-resizable-panels` v4 (uses `Group`, `Panel`, `Separator` exports)
- **Icons**: `lucide-react`
- **Notifications**: `sonner`
- **Animations**: `framer-motion`
- **IPC**: Tauri `invoke()` — frontend calls Rust commands via `src/renderer/src/lib/api.ts`
- **Credentials**: `keyring` crate (OS keychain for PAT) + `tauri-plugin-store` (org URL)
- **ADO API**: `azure_devops_rust_api` v0.34 (Rust backend)

## Project Structure
```
src/
  renderer/
    index.html
    src/
      App.tsx               # Auth routing (LoginScreen ↔ ResizableLayout)
      main.tsx              # QueryClient + Toaster providers
      lib/api.ts            # All Tauri invoke() calls — the IPC boundary
      types/index.ts        # Shared types (AdoProject, DiffModel, etc.)
      store/
        authStore.ts        # Zustand: auth state
        uiStore.ts          # Zustand: sidebar, pane selections, search, favorites
      hooks/
        useVariableDiff.ts  # Diff engine → DiffModel
        useSyncScroll.ts    # Synchronized scroll ref hook
        useADOApi.ts        # TanStack Query wrappers for ADO API
        useKeyboardShortcuts.ts
      components/
        SplashView.tsx
        auth/LoginScreen.tsx
        layout/
          ResizableLayout.tsx   # Custom title bar + window controls + 2-level resizable layout
          Sidebar.tsx           # Project/group tree sidebar
          SearchBar.tsx         # Ctrl+F key search
        diff/
          ComparisonArea.tsx    # Split pane container + toolbar
          DiffTable.tsx         # Core comparison table with inline edit
          PaneHeader.tsx
          EmptyPane.tsx
          DiffStats.tsx
        modals/
          ReviewChangesModal.tsx
          CloneLibraryModal.tsx
          ExportModal.tsx
          ImportModal.tsx
          PushReviewModal.tsx
src-tauri/
  src/
    lib.rs                  # Tauri app setup, managed state (CredentialsState)
    main.rs                 # Entry point
    commands/
      mod.rs
      auth.rs               # save/load/clear credentials (keyring + store)
      ado.rs                # Azure DevOps API calls via azure_devops_rust_api
      preferences.rs        # load/save favorites (tauri-plugin-store)
  capabilities/default.json # Tauri security permissions
  tauri.conf.json           # App config (frameless window, icons, build)
  Cargo.toml
```

## Important Notes
- **IPC pattern**: All backend calls go through `src/renderer/src/lib/api.ts` using `invoke()`
- **Credentials**: Loaded into `CredentialsState` (Mutex-wrapped managed state) on login; ADO commands read from state — never re-fetch from disk per call
- **react-resizable-panels v4** uses `Group`, `Panel`, `Separator` (not `PanelGroup`/`PanelResizeHandle`)
- Layout orientation prop is `orientation` (not `direction`)
- **Frameless window**: `decorations: false` in `tauri.conf.json`; custom title bar in `ResizableLayout.tsx` with `data-tauri-drag-region` for dragging and explicit window control buttons
- **Window controls** require permissions in `capabilities/default.json`: `core:window:allow-minimize`, `allow-toggle-maximize`, `allow-is-maximized`, `allow-close`, `core:window:allow-start-dragging`
- `azure_devops_rust_api` v0.34: use `Pat::new(pat)` for credentials; `updateVariableGroup()` takes `(params, project, group_id)`

## Commands
```bash
pnpm dev             # Start Tauri dev window (Vite + Rust)
pnpm build           # Production build
pnpm typecheck       # TypeScript type check
pnpm lint            # Biome lint
pnpm format          # Biome format
pnpm check           # Biome check (format + lint + imports)
```
