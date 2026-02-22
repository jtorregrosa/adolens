import * as ContextMenu from '@radix-ui/react-context-menu'
import type { ReactNode } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: ReactNode
  /** Render as a decorative divider before this item */
  dividerBefore?: boolean
  disabled?: boolean
  variant?: 'default' | 'danger'
  onSelect: () => void
}

interface AppContextMenuProps {
  items: ContextMenuItem[]
  children: ReactNode
}

/**
 * A higher-order wrapper that attaches a right-click context menu to its child.
 * Styled with the app's dark glassmorphism theme.
 */
export function AppContextMenu({ items, children }: AppContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className={[
            // Glassmorphism base
            'z-50 min-w-[180px] overflow-hidden rounded-lg border border-slate-700/60',
            'bg-slate-900/90 shadow-2xl backdrop-blur-xl',
            // Entrance animation
            'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            'p-1'
          ].join(' ')}
        >
          {items.map((item) => (
            <div key={item.label}>
              {item.dividerBefore && (
                <ContextMenu.Separator className="my-1 h-px bg-slate-700/60" />
              )}
              <ContextMenu.Item
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={[
                  'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs outline-none',
                  'transition-colors duration-100',
                  item.disabled
                    ? 'cursor-not-allowed text-slate-600'
                    : item.variant === 'danger'
                      ? 'text-red-400 focus:bg-red-500/15 focus:text-red-300 data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-300'
                      : 'text-slate-300 focus:bg-slate-700/70 focus:text-slate-100 data-[highlighted]:bg-slate-700/70 data-[highlighted]:text-slate-100'
                ].join(' ')}
              >
                {item.icon && (
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </ContextMenu.Item>
            </div>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
