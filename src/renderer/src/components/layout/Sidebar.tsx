import { open } from '@tauri-apps/plugin-shell'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  Info,
  Layers,
  Loader2,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  Search,
  Star,
  StarOff
} from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useProjects, useVariableGroup, useVariableGroups } from '../../hooks/useADOApi'
import { useDebounce } from '../../hooks/useDebounce'
import { clearCredentials } from '../../lib/api'
import { ANIMATION_DURATION_MS, SEARCH_DEBOUNCE_MS, TOOLTIP_DELAY_MS } from '../../lib/constants'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'

const AddLibraryModal = lazy(() =>
  import('../modals/AddLibraryModal').then((m) => ({ default: m.AddLibraryModal }))
)
const CloneLibraryModal = lazy(() =>
  import('../modals/CloneLibraryModal').then((m) => ({ default: m.CloneLibraryModal }))
)
const LibraryDetailsModal = lazy(() =>
  import('../modals/LibraryDetailsModal').then((m) => ({ default: m.LibraryDetailsModal }))
)
const ExportModal = lazy(() =>
  import('../modals/ExportModal').then((m) => ({ default: m.ExportModal }))
)

import type { AdoVariableGroup } from '../../types'
import type { ContextMenuItem } from '../ui/AppContextMenu'
import { AppContextMenu } from '../ui/AppContextMenu'
import { Tooltip } from '../ui/Tooltip'

// --- Library row ------------------------------------------------------------

/** Tooltip: library name and, if present, description only. */
function LibraryTooltipContent({
  groupName,
  group
}: {
  groupName: string
  group?: AdoVariableGroup
}): React.JSX.Element {
  if (!group) return <>{groupName}</>
  return (
    <div className="max-w-[240px] text-left">
      <div className="font-medium text-slate-200">{group.name}</div>
      {group.description && <div className="mt-1 text-xs text-slate-400">{group.description}</div>}
    </div>
  )
}

interface LibraryRowProps {
  groupId: number
  groupName: string
  projectId: string
  projectName: string
  orgUrl: string | null
  isFavorite: boolean
  onToggleFavorite: () => void
  onSelect: (side: 'left' | 'right') => void
  onExport: () => void
  onClone: () => void
  onShowDetails: () => void
  isLeft: boolean
  isRight: boolean
  /** Full group data for tooltip (name + description) and details modal */
  group?: AdoVariableGroup
}

function LibraryRow({
  groupId,
  groupName,
  projectName,
  orgUrl,
  isFavorite,
  onToggleFavorite,
  onSelect,
  onExport,
  onClone,
  onShowDetails,
  isLeft,
  isRight,
  group
}: LibraryRowProps): React.JSX.Element {
  const { t } = useTranslation()
  const libraryExternalUrl =
    orgUrl && projectName && groupName
      ? `${orgUrl.replace(/\/$/, '')}/${encodeURIComponent(projectName)}/_library?variableGroupId=${groupId}&itemType=VariableGroups&view=VariableGroupView&path=${encodeURIComponent(groupName)}`
      : ''
  const libraryMenuItems: ContextMenuItem[] = [
    {
      label: t('sidebar.loadLeft'),
      icon: <PanelLeft className="h-3.5 w-3.5" />,
      onSelect: () => onSelect('left')
    },
    {
      label: t('sidebar.loadRight'),
      icon: <PanelRight className="h-3.5 w-3.5" />,
      onSelect: () => onSelect('right')
    },
    {
      label: isFavorite ? t('sidebar.removeFavorite') : t('sidebar.markFavorite'),
      icon: isFavorite ? (
        <StarOff className="h-3.5 w-3.5 text-yellow-400" />
      ) : (
        <Star className="h-3.5 w-3.5" />
      ),
      dividerBefore: true,
      onSelect: onToggleFavorite
    },
    {
      label: t('sidebar.showDetails'),
      icon: <Info className="h-3.5 w-3.5" />,
      onSelect: onShowDetails
    },
    {
      label: t('sidebar.exportVariables'),
      icon: <Download className="h-3.5 w-3.5" />,
      dividerBefore: true,
      onSelect: onExport
    },
    {
      label: t('sidebar.cloneLibrary'),
      icon: <Copy className="h-3.5 w-3.5" />,
      onSelect: onClone
    },
    ...(libraryExternalUrl
      ? [
          {
            label: t('sidebar.goToExternalSource'),
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            dividerBefore: true,
            onSelect: () => open(libraryExternalUrl)
          }
        ]
      : [])
  ]

  const bgClass =
    isLeft && isRight
      ? 'bg-gradient-to-r from-blue-500/20 to-fuchsia-500/20 hover:from-blue-500/30 hover:to-fuchsia-500/30'
      : isLeft
        ? 'bg-blue-500/20 hover:bg-blue-500/30'
        : isRight
          ? 'bg-fuchsia-500/20 hover:bg-fuchsia-500/30'
          : 'hover:bg-slate-700/50'

  return (
    <AppContextMenu items={libraryMenuItems}>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition ${bgClass}`}
      >
        <Layers className="h-3 w-3 shrink-0 text-slate-500" />
        <Tooltip
          content={<LibraryTooltipContent groupName={groupName} group={group} />}
          side="top"
          delayDuration={TOOLTIP_DELAY_MS}
        >
          <div className="min-w-0 flex-1 truncate">
            <span className="block truncate">{groupName}</span>
          </div>
        </Tooltip>

        {/* Inline actions: shown on hover, star always visible when favourited */}
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip
            content={isFavorite ? t('sidebar.removeFromFavorites') : t('sidebar.addToFavorites')}
            side="top"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
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
            <Tooltip content={t('sidebar.loadLeftPane')} side="top">
              <button
                type="button"
                onClick={() => onSelect('left')}
                className={`sidebar-library-load-btn is-left rounded px-2 py-1 text-xs font-bold transition ${isLeft ? 'bg-blue-600 text-white' : 'bg-blue-500/30 text-blue-300 hover:bg-blue-600/70 hover:text-white'}`}
              >
                {t('sidebar.left').charAt(0)}
              </button>
            </Tooltip>
            <Tooltip content={t('sidebar.loadRightPane')} side="top">
              <button
                type="button"
                onClick={() => onSelect('right')}
                className={`sidebar-library-load-btn is-right rounded px-2 py-1 text-xs font-bold transition ${isRight ? 'bg-fuchsia-600 text-white' : 'bg-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-600/70 hover:text-white'}`}
              >
                {t('sidebar.right').charAt(0)}
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
  orgUrl: string | null
  isFavorite: boolean
  onToggleFavorite: () => void
}

function ProjectNode({
  projectId,
  projectName,
  orgUrl,
  isFavorite,
  onToggleFavorite
}: ProjectNodeProps): React.JSX.Element {
  const { t } = useTranslation()
  const projectExternalUrl =
    orgUrl && projectName ? `${orgUrl.replace(/\/$/, '')}/${encodeURIComponent(projectName)}` : ''
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS)
  const [exportGroupId, setExportGroupId] = useState<number | null>(null)
  const [exportGroupName, setExportGroupName] = useState<string | null>(null)
  const [cloneGroupId, setCloneGroupId] = useState<number | null>(null)
  const [cloneGroupName, setCloneGroupName] = useState<string | null>(null)
  const [showAddLibrary, setShowAddLibrary] = useState(false)
  const [detailsGroup, setDetailsGroup] = useState<AdoVariableGroup | null>(null)

  const { data: groups, isLoading } = useVariableGroups(expanded ? projectId : null)
  const { data: exportGroup } = useVariableGroup(
    exportGroupId !== null ? projectId : null,
    exportGroupId
  )
  const {
    setLeftPane,
    setRightPane,
    leftPane,
    rightPane,
    toggleFavoriteLibrary,
    isFavoriteLibrary
  } = useUIStore()

  const { favLibraries, regularLibraries, hasLibFavorites } = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase()
    const [fav, reg] = (groups ?? []).reduce(
      (acc, g) => {
        if (!g.name?.toLowerCase().includes(searchLower)) return acc
        if (!g.id) return acc
        acc[isFavoriteLibrary(g.id) ? 0 : 1].push(g)
        return acc
      },
      [[], []] as [AdoVariableGroup[], AdoVariableGroup[]]
    )
    fav.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    reg.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    return { favLibraries: fav, regularLibraries: reg, hasLibFavorites: fav.length > 0 }
  }, [groups, debouncedSearch, isFavoriteLibrary])

  const selectGroup = useCallback(
    (groupId: number, groupName: string, side: 'left' | 'right'): void => {
      if (side === 'left') setLeftPane({ projectId, projectName, groupId, groupName })
      else setRightPane({ projectId, projectName, groupId, groupName })
      toast.success(
        t('sidebar.groupLoaded', {
          name: groupName,
          side: side === 'left' ? t('sidebar.left') : t('sidebar.right')
        })
      )
    },
    [projectId, projectName, setLeftPane, setRightPane, t]
  )

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
      label: isFavorite ? t('sidebar.removeFavorite') : t('sidebar.markFavorite'),
      icon: isFavorite ? (
        <StarOff className="h-3.5 w-3.5 text-yellow-400" />
      ) : (
        <Star className="h-3.5 w-3.5" />
      ),
      onSelect: onToggleFavorite
    },
    {
      label: t('sidebar.addNewLibrary'),
      icon: <FolderPlus className="h-3.5 w-3.5" />,
      dividerBefore: true,
      onSelect: () => {
        setExpanded(true)
        setShowAddLibrary(true)
      }
    },
    ...(projectExternalUrl
      ? [
          {
            label: t('sidebar.goToExternalSource'),
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            dividerBefore: true,
            onSelect: () => open(projectExternalUrl)
          }
        ]
      : [])
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
          <Tooltip
            content={isFavorite ? t('sidebar.removeFromFavorites') : t('sidebar.addToFavorites')}
            side="right"
          >
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
      {exportGroup && exportGroupId !== null && exportGroup.variables && (
        <Suspense fallback={null}>
          <ExportModal
            variables={exportGroup.variables}
            groupName={exportGroupName}
            onClose={() => {
              setExportGroupId(null)
              setExportGroupName(null)
            }}
          />
        </Suspense>
      )}

      {/* Add new library modal */}
      {showAddLibrary && (
        <Suspense fallback={null}>
          <AddLibraryModal
            projectId={projectId}
            projectName={projectName}
            onClose={() => setShowAddLibrary(false)}
          />
        </Suspense>
      )}

      {/* Library details modal */}
      {detailsGroup != null && (
        <Suspense fallback={null}>
          <LibraryDetailsModal
            group={detailsGroup}
            projectName={projectName}
            onClose={() => setDetailsGroup(null)}
          />
        </Suspense>
      )}

      {/* Clone modal */}
      {cloneGroupId !== null && cloneGroupName !== null && (
        <Suspense fallback={null}>
          <CloneLibraryModal
            projectId={projectId}
            groupId={cloneGroupId}
            sourceName={cloneGroupName}
            onClose={() => {
              setCloneGroupId(null)
              setCloneGroupName(null)
            }}
          />
        </Suspense>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: ANIMATION_DURATION_MS / 1000 }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-1 space-y-0.5">
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('sidebar.searchLibraries')}
                  className="selectable w-full rounded border border-slate-700 bg-slate-800 py-1 pl-6 pr-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-blue-500"
                />
              </div>

              {isLoading && (
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('sidebar.loading')}
                </div>
              )}

              {/* ⭐ Favorite libraries */}
              {hasLibFavorites && (
                <>
                  <SectionHeader label={t('sidebar.favorites')} />
                  {favLibraries.map((g) => {
                    if (!g.id || !g.name) return null
                    const isLeft = leftPane.groupId === g.id && leftPane.projectId === projectId
                    const isRight = rightPane.groupId === g.id && rightPane.projectId === projectId
                    return (
                      <LibraryRow
                        key={g.id}
                        groupId={g.id}
                        groupName={g.name}
                        projectId={projectId}
                        projectName={projectName}
                        orgUrl={orgUrl}
                        isFavorite={true}
                        onToggleFavorite={() => toggleFavoriteLibrary(g.id!)}
                        onSelect={(side) => selectGroup(g.id!, g.name!, side)}
                        onExport={() => handleExport(g.id!, g.name!)}
                        onClone={() => handleClone(g.id!, g.name!)}
                        onShowDetails={() => setDetailsGroup(g)}
                        isLeft={isLeft}
                        isRight={isRight}
                        group={g}
                      />
                    )
                  })}
                  <SectionHeader label={t('sidebar.allLibraries')} />
                </>
              )}

              {/* Regular libraries */}
              {regularLibraries.map((g) => {
                if (!g.id || !g.name) return null
                const isLeft = leftPane.groupId === g.id && leftPane.projectId === projectId
                const isRight = rightPane.groupId === g.id && rightPane.projectId === projectId
                return (
                  <LibraryRow
                    key={g.id}
                    groupId={g.id}
                    groupName={g.name}
                    projectId={projectId}
                    projectName={projectName}
                    orgUrl={orgUrl}
                    isFavorite={false}
                    onToggleFavorite={() => toggleFavoriteLibrary(g.id!)}
                    onSelect={(side) => selectGroup(g.id!, g.name!, side)}
                    onExport={() => handleExport(g.id!, g.name!)}
                    onClone={() => handleClone(g.id!, g.name!)}
                    onShowDetails={() => setDetailsGroup(g)}
                    isLeft={isLeft}
                    isRight={isRight}
                    group={g}
                  />
                )
              })}

              {!isLoading && favLibraries.length === 0 && regularLibraries.length === 0 && (
                <p className="px-2 py-1 text-xs text-slate-600">{t('sidebar.noGroupsFound')}</p>
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
  const { t } = useTranslation()
  const orgUrl = useAuthStore((s) => s.orgUrl)
  const {
    sidebarCollapsed,
    toggleSidebar,
    favoriteProjectIds,
    toggleFavoriteProject,
    isFavoriteProject
  } = useUIStore()
  const logout = useAuthStore((s) => s.logout)
  const [projectSearch, setProjectSearch] = useState('')
  const [scrollShadeTop, setScrollShadeTop] = useState(false)
  const [scrollShadeBottom, setScrollShadeBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data: projects, isLoading, isError } = useProjects()

  const updateScrollShades = useCallback((): void => {
    const el = scrollRef.current
    if (!el) return
    setScrollShadeTop(el.scrollTop > 0)
    setScrollShadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
  }, [])

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
  }, [updateScrollShades])

  const handleLogout = (): void => {
    flushSync(() => {
      logout()
    })
    toast.info(t('sidebar.toast.loggedOut'))
    clearCredentials().catch(() => {})
  }

  const debouncedProjectSearch = useDebounce(projectSearch, SEARCH_DEBOUNCE_MS)

  const { favoriteProjects, regularProjects, hasFavorites } = useMemo(() => {
    const searchLower = debouncedProjectSearch.toLowerCase()
    const result = (projects ?? []).reduce(
      (acc, p) => {
        if (!p.name?.toLowerCase().includes(searchLower)) return acc
        if (!p.id) return acc
        acc[isFavoriteProject(p.id) ? 0 : 1].push(p)
        return acc
      },
      [[], []] as [NonNullable<typeof projects>, NonNullable<typeof projects>]
    )
    const fav = result[0]
    const reg = result[1]
    fav.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    reg.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    return {
      favoriteProjects: fav,
      regularProjects: reg,
      hasFavorites: favoriteProjectIds.length > 0 && fav.length > 0
    }
  }, [projects, debouncedProjectSearch, isFavoriteProject, favoriteProjectIds.length])

  return (
    <div className="sidebar-inner flex h-full w-full flex-col bg-slate-900">
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-2">
        {!sidebarCollapsed && (
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {t('sidebar.projects')}
          </span>
        )}
        <Tooltip
          content={sidebarCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
          side="right"
        >
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
                placeholder={t('sidebar.searchProjects')}
                className="selectable w-full rounded-md border border-slate-700 bg-slate-800 py-1.5 pl-7 pr-2 text-xs text-slate-300 placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Project list with top/bottom scroll shades */}
          <div className="relative flex-1 min-h-0">
            {/* Top scroll shade */}
            <div
              aria-hidden
              className={`sidebar-scroll-shade-top pointer-events-none absolute left-0 right-0 top-0 z-10 h-6 transition-opacity duration-200 ${
                scrollShadeTop ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                background:
                  'linear-gradient(to bottom, var(--sidebar-bg, rgb(15 23 42)) 0%, transparent 100%)'
              }}
            />
            {/* Bottom scroll shade */}
            <div
              aria-hidden
              className={`sidebar-scroll-shade-bottom pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 transition-opacity duration-200 ${
                scrollShadeBottom ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                background:
                  'linear-gradient(to top, var(--sidebar-bg, rgb(15 23 42)) 0%, transparent 100%)'
              }}
            />
            <div ref={scrollRef} className="scrollbar-hide h-full overflow-y-auto px-1 pb-2">
              {isLoading && (
                <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('sidebar.loadingProjects')}
                </div>
              )}
              {isError && (
                <div className="flex items-start gap-2 rounded-md bg-red-900/20 p-3 text-xs text-red-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t('sidebar.failedToLoadProjects')}
                </div>
              )}

              {/* Favorites section */}
              {hasFavorites && (
                <>
                  <SectionHeader label={t('sidebar.favorites')} />
                  {favoriteProjects.map((p) => {
                    if (!p.id || !p.name) return null
                    const projectId = p.id
                    return (
                      <ProjectNode
                        key={projectId}
                        projectId={projectId}
                        projectName={p.name}
                        orgUrl={orgUrl}
                        isFavorite={true}
                        onToggleFavorite={() => toggleFavoriteProject(projectId)}
                      />
                    )
                  })}
                  <SectionHeader label={t('sidebar.allProjects')} />
                </>
              )}

              {/* Regular projects */}
              {regularProjects.map((p) => {
                if (!p.id || !p.name) return null
                const projectId = p.id
                return (
                  <ProjectNode
                    key={projectId}
                    projectId={projectId}
                    projectName={p.name}
                    orgUrl={orgUrl}
                    isFavorite={false}
                    onToggleFavorite={() => toggleFavoriteProject(projectId)}
                  />
                )
              })}
            </div>
          </div>

          {/* Footer — same height as pane header and stats footer (h-10) */}
          <div className="sidebar-disconnect-footer flex h-10 shrink-0 items-center justify-center border-t border-red-900/60 bg-red-950/80 px-2 py-2">
            <button
              type="button"
              onClick={handleLogout}
              className="sidebar-disconnect-btn flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-200 transition hover:bg-red-900/50 hover:text-red-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('sidebar.disconnect')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
