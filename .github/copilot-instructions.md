# ADO Lens - Workspace Instructions

## Tech Stack
- **Runtime**: Electron 39+ (Main/Renderer via contextBridge)
- **Frontend**: React 18 + TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (dark mode by default, `@tailwindcss/vite` plugin)
- **State**: Zustand (UI) + TanStack Query v5 (server state)
- **Layout**: `react-resizable-panels` v4 (uses `Group`, `Panel`, `Separator` exports)
- **Icons**: `lucide-react`
- **Notifications**: `sonner`
- **Animations**: `framer-motion`
- **Security**: `electron-store` for URLs; `safeStorage` for PAT encryption

## Project Structure
```
src/
  main/
    index.ts              # Electron main process entry
    ipc/
      auth.ts             # IPC: save/load/clear credentials
      ado.ts              # IPC: Azure DevOps API calls via azure-devops-node-api
  preload/
    index.ts              # contextBridge exposing window.api
    index.d.ts            # Type declarations for window.api
  renderer/src/
    App.tsx               # Auth routing (LoginScreen ↔ ResizableLayout)
    main.tsx              # QueryClient + Toaster providers
    types/index.ts        # Shared types (AdoProject, DiffModel, etc.)
    store/
      authStore.ts        # Zustand: auth state
      uiStore.ts          # Zustand: sidebar, pane selections, search
    hooks/
      useVariableDiff.ts  # Diff engine → DiffModel
      useSyncScroll.ts    # Synchronized scroll ref hook
      useADOApi.ts        # TanStack Query wrappers for ADO API
      useKeyboardShortcuts.ts
    components/
      auth/LoginScreen.tsx
      layout/
        ResizableLayout.tsx   # 2-level resizable layout
        Sidebar.tsx           # Project/group tree sidebar
        SearchBar.tsx         # Ctrl+F key search
      diff/
        ComparisonArea.tsx   # Split pane container + toolbar
        DiffTable.tsx        # Core comparison table with inline edit
        PaneHeader.tsx
        EmptyPane.tsx
        DiffStats.tsx
      modals/
        ReviewChangesModal.tsx
```

## Important Notes
- **react-resizable-panels v4** uses `Group`, `Panel`, `Separator` (not `PanelGroup`/`PanelResizeHandle`)
- Layout orientation prop is `orientation` (not `direction`)
- `electron-store` v11 has no generic schema in constructor; use type assertions
- `azure-devops-node-api`'s `updateVariableGroup()` takes 2 args: `(group, id)` not 3
- The PAT is encrypted via `safeStorage.encryptString` with base64 serialization

## Commands
```bash
npm run dev          # Start dev server + Electron
npm run build        # Typecheck + production build
npm run typecheck    # Run all TS checks (node + web)
```
