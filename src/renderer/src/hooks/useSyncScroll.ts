import { useCallback, useRef } from 'react'

/**
 * Returns two ref callbacks that, when attached to two scrollable containers,
 * keep them scrolled in perfect vertical (and optionally horizontal) sync.
 */
export function useSyncScroll(enabled: boolean): {
  leftRef: (el: HTMLDivElement | null) => void
  rightRef: (el: HTMLDivElement | null) => void
} {
  const leftEl = useRef<HTMLDivElement | null>(null)
  const rightEl = useRef<HTMLDivElement | null>(null)
  const syncing = useRef(false)

  const handleLeftScroll = useCallback(() => {
    if (!enabled || syncing.current || !leftEl.current || !rightEl.current) return
    syncing.current = true
    rightEl.current.scrollTop = leftEl.current.scrollTop
    rightEl.current.scrollLeft = leftEl.current.scrollLeft
    syncing.current = false
  }, [enabled])

  const handleRightScroll = useCallback(() => {
    if (!enabled || syncing.current || !leftEl.current || !rightEl.current) return
    syncing.current = true
    leftEl.current.scrollTop = rightEl.current.scrollTop
    leftEl.current.scrollLeft = rightEl.current.scrollLeft
    syncing.current = false
  }, [enabled])

  const leftRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (leftEl.current) leftEl.current.removeEventListener('scroll', handleLeftScroll)
      leftEl.current = el
      if (el) el.addEventListener('scroll', handleLeftScroll, { passive: true })
    },
    [handleLeftScroll]
  )

  const rightRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (rightEl.current) rightEl.current.removeEventListener('scroll', handleRightScroll)
      rightEl.current = el
      if (el) el.addEventListener('scroll', handleRightScroll, { passive: true })
    },
    [handleRightScroll]
  )

  return { leftRef, rightRef }
}
