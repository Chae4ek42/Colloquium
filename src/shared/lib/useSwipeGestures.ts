import { useEffect, useRef, type RefObject } from 'react'
import { isInteractiveTouchTarget, useIsMobileTouch } from './media'

export type SwipeDirection = 'left' | 'right'

export interface SwipeGestureHandlers {
  /** ← */
  onSwipeLeft?: () => void
  /** → */
  onSwipeRight?: () => void
}

const SWIPE_THRESHOLD_PX = 56
const SWIPE_MAX_DURATION_MS = 480
const SWIPE_AXIS_RATIO = 1.3
const SWIPE_MIN_SPEED = 0.22 // px/ms — slower gestures are treated as scroll

interface TouchOrigin {
  x: number
  y: number
  at: number
}

/**
 * Mobile-only horizontal swipes mapped to practice shortcuts.
 */
export function useSwipeGestures(
  targetRef: RefObject<HTMLElement | null>,
  handlers: SwipeGestureHandlers,
  enabled = true,
): boolean {
  const isMobile = useIsMobileTouch()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const active = enabled && isMobile

  useEffect(() => {
    const node = targetRef.current
    if (!active || !node) return

    let origin: TouchOrigin | null = null
    let trackingId: number | null = null

    const clear = () => {
      origin = null
      trackingId = null
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        clear()
        return
      }
      if (isInteractiveTouchTarget(event.target)) {
        clear()
        return
      }
      const touch = event.touches[0]
      if (!touch) return
      trackingId = touch.identifier
      origin = { x: touch.clientX, y: touch.clientY, at: Date.now() }
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (!origin || trackingId == null) return
      const touch =
        Array.from(event.changedTouches).find((item) => item.identifier === trackingId) ?? null
      if (!touch) {
        clear()
        return
      }

      const dx = touch.clientX - origin.x
      const dy = touch.clientY - origin.y
      const elapsed = Date.now() - origin.at
      clear()

      if (elapsed > SWIPE_MAX_DURATION_MS) return

      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      const speed = Math.max(absX, absY) / Math.max(elapsed, 1)
      if (speed < SWIPE_MIN_SPEED) return

      if (absX < absY * SWIPE_AXIS_RATIO || absX < SWIPE_THRESHOLD_PX) return

      const current = handlersRef.current
      if (dx < 0) current.onSwipeLeft?.()
      else current.onSwipeRight?.()
    }

    const onTouchCancel = () => clear()

    node.addEventListener('touchstart', onTouchStart, { passive: true })
    node.addEventListener('touchend', onTouchEnd, { passive: true })
    node.addEventListener('touchcancel', onTouchCancel, { passive: true })

    return () => {
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchend', onTouchEnd)
      node.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [active, targetRef])

  return active
}
