import { useState, useRef, useEffect } from 'react'
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
  PanelLeftOpen,
  Star,
  Download,
  PanelLeft,
  PanelRight,
  StarOff,
  Copy
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { useProjects, useVariableGroups, useVariableGroup } from '../../hooks/useADOApi'
import { clearCredentials } from '../../lib/api'
import { toast } from 'sonner'
import { AppContextMenu } from '../ui/AppContextMenu'
import type { ContextMenuItem } from '../ui/AppContextMenu'
import { Tooltip } from '../ui/Tooltip'
import { ExportModal } from '../modals/ExportModal'
import { CloneLibraryModal } from '../modals/CloneLibraryModal'

// --- Library row ------------------------------------------------------------

interface LibraryRowProps {
  groupId: number
  groupName: string
  projectId: string
  projectName: string
  isFavorite: boolean
  onToggleFavorite: () => void
  onSelect: (side: 'left' | 'right') => void
  onExport: () => void
  onClone: () => void
  isLeft: boolean
  isRight: boolean
}

function LibraryRow({
  groupName,
  isFavorite,
  onToggleFavorite,
  onSelect,
  onExport,
  onClone,
  isLeft,
  isRight
}: LibraryRowProps): React.JSX.Element {
  const libraryMenuItems: ContextMenuItem[] = [
    {
      label: 'Load into Left Pane',
      icon: <PanelLeft className="h-3.5 w-3.5" />,
      onSelect: () => onSelect('left')
    },
    {
      label: 'Load into Right Pane',
      icon: <PanelRight className="h-3.5 w-3.5" />,
      onSelect: () => onSelect('right')
    },
    {
      label: isFavorite ? 'Remove from Favorites' : 'Mark as Favorite',
      icon: isFavorite ? (
        <StarOff className="h-3.5 w-3.5 text-yellow-400" />
      ) : (
        <Star className="h-3.5 w-3.5" />
      ),
      dividerBefore: true,
      onSelect: onToggleFavorite
    },
    {
      label: 'Export Variables…',
      icon: <Download className="h-3.5 w-3.5" />,
      dividerBefore: true,
      onSelect: onExport
    },
    {
      label: 'Clone Library…',
      icon: <Copy className="h-3.5 w-3.5" />,
      onSelect: onClone
    }
  ]

  return (
    <AppContextMenu items={libraryMenuItems}>
      <div className="group flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700/50">
        <Layers className="h-3 w-3 shrink-0 text-slate-500" />
        <Tooltip content={groupName} side="top">
          <div className="min-w-0 flex-1 truncate">
            <span className="block truncate">{groupName}</span>
          </div>
        </Tooltip>

        {/* Inline actions: shown on hover, star always visible when favourited */}
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip content={isFavorite ? 'Remove from favorites' : 'Add to favorites'} side="top">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
              className={`rounded p-0.5 transition ${
                isFavorite
                  ? 'text-yellow-400 opacity-100'
                  : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
              }`}
            >
              <Star className={`h-3 w-3 ${isFavorite ? 'fill-yellow-400' : ''}`} />
            </button>
          </Tooltip>
          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
            <Tooltip content="Load into Left pane" side="top">
              <button
                onClick={() => onSelect('left')}
                className={`rounded px-2 py-1 text-xs font-bold transition ${isLeft ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-blue-600/70 hover:text-white'}`}
              >
                L
              </button>
            </Tooltip>
            <Tooltip content="Load into Right pane" side="top">
              <button
                onClick={() => onSelect('right')}
                className={`rounded px-2 py-1 text-xs font-bold transition ${isRight ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-fuchsia-600/70 hover:text-white'}`}
              >
                R
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </AppContextMenu>
  )
}

// --- Project node -----------------------------------------------------------

interface ProjectNodeProps {
  projectId: string
  projectName: string
  isFavorite: boolean
  onToggleFavorite: () => void
}

function ProjectNode({
  projectId,
  projectName,
  isFavorite,
  onToggleFavorite
}: ProjectNodeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [exportGroupId, setExportGroupId] = useState<number | null>(null)
  const [exportGroupName, setExportGroupName] = useState<string | null>(null)
  const [cloneGroupId, setCloneGroupId] = useState<number | null>(null)
  const [cloneGroupName, setCloneGroupName] = useState<string | null>(null)

  const { data: groups, isLoading } = useVariableGroups(expanded ? projectId : null)
  const { data: exportGroup } = useVariableGroup(
    exportGroupId !== null ? projectId : null,
    exportGroupId
  )
  const { setLeftPane, setRightPane, leftPane, rightPane, toggleFavoriteLibrary, isFavoriteLibrary } =
    useUIStore()

  const filtered = (groups ?? []).filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  const favLibraries = filtered
    .filter((g) => isFavoriteLibrary(g.id!))
    .sort((a, b) => a.name!.localeCompare(b.name!))
  const regularLibraries = filtered
    .filter((g) => !isFavoriteLibrary(g.id!))
    .sort((a, b) => a.name!.localeCompare(b.name!))
  const hasLibFavorites = favLibraries.length > 0

  const selectGroup = (groupId: number, groupName: string, side: 'left' | 'right'): void => {
    if (side === 'left') setLeftPane({ projectId, projectName, groupId, groupName })
    else setRightPane({ projectId, projectName, groupId, groupName })
    toast.success(`${groupName} loaded in ${side === 'left' ? 'Left' : 'Right'} pane`)
  }

  const handleExport = (groupId: number, groupName: string): void => {
    setExportGroupId(groupId)
    setExportGroupName(groupName)
  }

  const handleClone = (groupId: number, groupName: string): void => {
    setCloneGroupId(groupId)
    setCloneGroupName(groupName)
  }

  const projectMenuItems: ContextMenuItem[] = [
    {
      label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      icon: isFavorite ? (
        <StarOff className="h-3.5 w-3.5 text-yellow-400" />
      ) : (
        <Star className="h-3.5 w-3.5" />
      ),
      onSelect: onToggleFavorite
    }
  ]

  return (
    <div>
      <AppContextMenu items={projectMenuItems}>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 transition hover:bg-slate-700/50"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          )}
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          <Tooltip content={projectName} side="top">
            <div className="min-w-0 flex-1 truncate">
              <span className="block truncate font-medium">{projectName}</span>
            </div>
          </Tooltip>
          <Tooltip content={isFavorite ? 'Remove from favorites' : 'Add to favorites'} side="right">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              className={`ml-auto shrink-0 rounded p-0.5 transition ${
                isFavorite
                  ? 'text-yellow-400 opacity-100'
                  : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
              }`}
            >
              <Star className={`h-3 w-3 ${isFavorite ? 'fill-yellow-400' : ''}`} />
            </button>
          </Tooltip>
        </button>
      </AppContextMenu>

      {/* Export modal — rendered outside the AnimatePresence so it stays mounted */}
      {exportGroup && exportGroupId !== null && (
        <ExportModal
          variables={exportGroup.variables}
          groupName={exportGroupName}
          onClose={() => { setExportGroupId(null); setExportGroupName(null) }}
        />
      )}

      {/* Clone modal */}
      {cloneGroupId !== null && cloneGroupName !== null && (
        <CloneLibraryModal
          projectId={projectId}
          groupId={cloneGroupId}
          sourceName={cloneGroupName}
          onClose={() => { setCloneGroupId(null); setCloneGroupName(null) }}
        />
      )}

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
                  Loading...
                </div>
              )}

              {/* ⭐ Favorite libraries */}
              {hasLibFavorites && (
                <>
                  <SectionHeader label="Favorites" />
                  <AnimatePresence>
                    {favLibraries.map((g) => {
                      const isLeft = leftPane.groupId === g.id && leftPane.projectId === projectId
                      const isRight = rightPane.groupId === g.id && rightPane.projectId === projectId
                      return (
                        <motion.div
                          key={g.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <LibraryRow
                            groupId={g.id!}
                            groupName={g.name!}
                            projectId={projectId}
                            projectName={projectName}
                            isFavorite={true}
                            onToggleFavorite={() => toggleFavoriteLibrary(g.id!)}
                            onSelect={(side) => selectGroup(g.id!, g.name!, side)}
                            onExport={() => handleExport(g.id!, g.name!)}
                            onClone={() => handleClone(g.id!, g.name!)}
                            isLeft={isLeft}
                            isRight={isRight}
                          />
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                  <SectionHeader label="All Libraries" />
                </>
              )}

              {/* Regular libraries */}
              <AnimatePresence>
                {regularLibraries.map((g) => {
                  const isLeft = leftPane.groupId === g.id && leftPane.projectId === projectId
                  const isRight = rightPane.groupId === g.id && rightPane.projectId === projectId
                  return (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <LibraryRow
                        groupId={g.id!}
                        groupName={g.name!}
                        projectId={projectId}
                        projectName={projectName}
                        isFavorite={false}
                        onToggleFavorite={() => toggleFavoriteLibrary(g.id!)}
                        onSelect={(side) => selectGroup(g.id!, g.name!, side)}
                        onExport={() => handleExport(g.id!, g.name!)}
                        onClone={() => handleClone(g.id!, g.name!)}
                        isLeft={isLeft}
                        isRight={isRight}
                      />
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {!isLoading && favLibraries.length === 0 && regularLibraries.length === 0 && (
                <p className="px-2 py-1 text-xs text-slate-600">No groups found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Section header ---------------------------------------------------------

function SectionHeader({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="mb-1 mt-2 flex items-center gap-1.5 px-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-800" />
    </div>
  )
}

// --- Main Sidebar -----------------------------------------------------------

export function Sidebar(): React.JSX.Element {
  const {
    sidebarCollapsed,
    toggleSidebar,
    favoriteProjectIds,
    toggleFavoriteProject,
    isFavoriteProject
  } = useUIStore()
  const { logout } = useAuthStore()
  const [projectSearch, setProjectSearch] = useState('')
  const [scrollShadeTop, setScrollShadeTop] = useState(false)
  const [scrollShadeBottom, setScrollShadeBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data: projects, isLoading, isError } = useProjects()

  const updateScrollShades = (): void => {
    const el = scrollRef.current
    if (!el) return
    setScrollShadeTop(el.scrollTop > 0)
    setScrollShadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollShades()
    el.addEventListener('scroll', updateScrollShades)
    const ro = new ResizeObserver(updateScrollShades)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollShades)
      ro.disconnect()
    }
  }, [sidebarCollapsed, projects, projectSearch])

  const handleLogout = async (): Promise<void> => {
    await clearCredentials()
    logout()
    toast.info('Logged out')
  }

  const all = projects ?? []
  const filtered = all.filter((p) =>
    p.name!.toLowerCase().includes(projectSearch.toLowerCase())
  )
  const favoriteProjects = filtered
    .filter((p) => isFavoriteProject(p.id!))
    .sort((a, b) => a.name!.localeCompare(b.name!))
  const regularProjects = filtered
    .filter((p) => !isFavoriteProject(p.id!))
    .sort((a, b) => a.name!.localeCompare(b.name!))
  const hasFavorites = favoriteProjectIds.length > 0 && favoriteProjects.length > 0

  return (
    <div className="flex h-full w-full flex-col bg-slate-900">
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-2">
        {!sidebarCollapsed && (
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Projects
          </span>
        )}
        <Tooltip content={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
          <button
            onClick={toggleSidebar}
            className="ml-auto rounded p-1 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </Tooltip>
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
                placeholder="Search projects..."
                className="selectable w-full rounded-md border border-slate-700 bg-slate-800 py-1.5 pl-7 pr-2 text-xs text-slate-300 placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Project list with top/bottom scroll shades */}
          <div className="relative flex-1 min-h-0">
            {/* Top scroll shade */}
            <div
              aria-hidden
              className={`pointer-events-none absolute left-0 right-0 top-0 z-10 h-6 transition-opacity duration-200 ${
                scrollShadeTop ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                background: 'linear-gradient(to bottom, var(--sidebar-bg, rgb(15 23 42)) 0%, transparent 100%)'
              }}
            />
            {/* Bottom scroll shade */}
            <div
              aria-hidden
              className={`pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 transition-opacity duration-200 ${
                scrollShadeBottom ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                background: 'linear-gradient(to top, var(--sidebar-bg, rgb(15 23 42)) 0%, transparent 100%)'
              }}
            />
            <div
              ref={scrollRef}
              className="scrollbar-hide h-full overflow-y-auto px-1 pb-2"
            >
            {isLoading && (
              <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading projects...
              </div>
            )}
            {isError && (
              <div className="flex items-start gap-2 rounded-md bg-red-900/20 p-3 text-xs text-red-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Failed to load projects
              </div>
            )}

            {/* Favorites section */}
            {hasFavorites && (
              <>
                <SectionHeader label="Favorites" />
                <AnimatePresence>
                  {favoriteProjects.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ProjectNode
                        projectId={p.id!}
                        projectName={p.name!}
                        isFavorite={true}
                        onToggleFavorite={() => toggleFavoriteProject(p.id!)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                <SectionHeader label="All Projects" />
              </>
            )}

            {/* Regular projects */}
            <AnimatePresence>
              {regularProjects.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProjectNode
                    projectId={p.id!}
                    projectName={p.name!}
                    isFavorite={false}
                    onToggleFavorite={() => toggleFavoriteProject(p.id!)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 p-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
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
