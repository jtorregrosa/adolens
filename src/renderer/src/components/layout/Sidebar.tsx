import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Layers,
  Search,
  Loader2,
  AlertCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { useProjects, useVariableGroups } from '../../hooks/useADOApi'
import { toast } from 'sonner'

function ProjectNode({ projectId, projectName }: { projectId: string; projectName: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const { data: groups, isLoading } = useVariableGroups(expanded ? projectId : null)
  const { setLeftPane, setRightPane, leftPane, rightPane } = useUIStore()

  const filtered = (groups ?? []).filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectGroup = (groupId: number, groupName: string, side: 'left' | 'right'): void => {
    if (side === 'left') setLeftPane({ projectId, projectName, groupId, groupName })
    else setRightPane({ projectId, projectName, groupId, groupName })
    toast.success(`${groupName} loaded in ${side === 'left' ? 'Left' : 'Right'} pane`)
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 transition hover:bg-slate-700/50"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        )}
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        <div className="marquee-wrap">
          <span className="marquee-text font-medium">{projectName}</span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-1 space-y-0.5">
              {/* Search within groups */}
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search libraries"
                  className="selectable w-full rounded border border-slate-700 bg-slate-800 py-1 pl-6 pr-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-blue-500"
                />
              </div>

              {isLoading && (
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading…
                </div>
              )}

              {filtered.map((g) => {
                const isLeft = leftPane.groupId === g.id && leftPane.projectId === projectId
                const isRight = rightPane.groupId === g.id && rightPane.projectId === projectId
                return (
                  <div
                    key={g.id}
                    className="group flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700/50"
                  >
                    <Layers className="h-3 w-3 shrink-0 text-slate-500" />
                    <div className="marquee-wrap">
                      <span className="marquee-text">{g.name}</span>
                    </div>

                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        title="Load in Left pane"
                        onClick={() => selectGroup(g.id!, g.name!, 'left')}
                        className={`rounded px-2 py-1 text-xs font-bold transition ${isLeft ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-blue-600/70 hover:text-white'}`}
                      >
                        L
                      </button>
                      <button
                        title="Load in Right pane"
                        onClick={() => selectGroup(g.id!, g.name!, 'right')}
                        className={`rounded px-2 py-1 text-xs font-bold transition ${isRight ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-fuchsia-600/70 hover:text-white'}`}
                      >
                        R
                      </button>
                    </div>

                  </div>
                )
              })}

              {!isLoading && filtered.length === 0 && (
                <p className="px-2 py-1 text-xs text-slate-600">No groups found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Sidebar(): React.JSX.Element {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { logout } = useAuthStore()
  const [projectSearch, setProjectSearch] = useState('')
  const { data: projects, isLoading, isError } = useProjects()

  const handleLogout = async (): Promise<void> => {
    await window.api.clearCredentials()
    logout()
    toast.info('Logged out')
  }

  const filtered = (projects ?? []).filter((p) =>
    p.name!.toLowerCase().includes(projectSearch.toLowerCase())
  )

  return (
    <div
      className="flex h-full w-full flex-col bg-slate-900"
    >
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-2">
        {!sidebarCollapsed && (
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Projects
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto rounded p-1 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {!sidebarCollapsed && (
        <>
          {/* Project search */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Search projects…"
                className="selectable w-full rounded-md border border-slate-700 bg-slate-800 py-1.5 pl-7 pr-2 text-xs text-slate-300 placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Project list */}
          <div className="flex-1 overflow-y-auto px-1 pb-2">
            {isLoading && (
              <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading projects…
              </div>
            )}
            {isError && (
              <div className="flex items-start gap-2 rounded-md bg-red-900/20 p-3 text-xs text-red-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Failed to load projects
              </div>
            )}
            {filtered.map((p) => (
              <ProjectNode key={p.id} projectId={p.id!} projectName={p.name!} />
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 p-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-700/50 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  )
}
