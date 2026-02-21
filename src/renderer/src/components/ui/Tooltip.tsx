import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export { TooltipPrimitive }

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /** Delay before tooltip shows, in ms. Defaults to 500. */
  delayDuration?: number
}

/**
 * Lightweight styled tooltip wrapper.
 * Requires <TooltipProvider> somewhere up the tree (added in main.tsx).
 */
export function Tooltip({
  content,
  children,
  side = 'bottom',
  align = 'center',
  delayDuration
}: TooltipProps): React.JSX.Element {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={[
            'z-50 max-w-xs select-none rounded-md px-2.5 py-1.5',
            'break-all whitespace-normal',
            'border border-slate-700/60 bg-slate-900/95 text-xs text-slate-200 shadow-xl backdrop-blur-md',
            'animate-in fade-in-0 zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
            'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1'
          ].join(' ')}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-slate-700/60" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
