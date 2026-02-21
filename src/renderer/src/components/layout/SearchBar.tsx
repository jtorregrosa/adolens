import { Search, X } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useEffect, useRef } from 'react'

export function SearchBar(): React.JSX.Element {
  const { searchQuery, setSearchQuery } = useUIStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus via global Ctrl+F
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setSearchQuery('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchQuery])

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-500" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search keys… (Ctrl+F)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="selectable w-52 rounded-lg border border-slate-700 bg-slate-800 py-1.5 pl-8 pr-7 text-xs text-slate-300 placeholder-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2 text-slate-500 hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
