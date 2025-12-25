import { useEffect, useRef, useState, useCallback } from 'react'
import { getGestureRecognizer } from '@/lib/gesture-recognizer'

interface Point {
  x: number
  y: number
  timestamp?: number
}

export interface GestureResult {
  type: 'number' | 'letter' | 'symbol' | 'unknown'
  value: string
  confidence: number
}

export type GestureAction = {
  gesture: string
  action: () => void
  description: string
}

interface UseGestureRecognitionOptions {
  enabled?: boolean
  minPoints?: number
  gestureTimeout?: number
  onGestureRecognized?: (result: GestureResult) => void
  actions?: GestureAction[]
}

// Map gesture classes to result types
function getGestureType(gesture: string): 'number' | 'letter' | 'symbol' | 'unknown' {
  if (/^[0-9]$/.test(gesture)) return 'number'
  if (/^[a-zA-Z]$/.test(gesture)) return 'letter'
  if (['circle', 'check', 'x', 'arrow_right', 'arrow_left', 'arrow_up', 'arrow_down', 'triangle', 'square', 'star', 'search', 'next', 'prev'].includes(gesture)) {
    return 'symbol'
  }
  return 'unknown'
}

// Map ML gesture names to action gesture names
function mapGestureToAction(gesture: string): string {
  const mapping: Record<string, string> = {
    'arrow_right': 'next',
    'arrow_left': 'prev',
    'circle': 'search',
  }
  return mapping[gesture] || gesture
}

/**
 * ML-powered gesture recognition hook for drawing patterns with cursor
 * Requires holding Shift key or right mouse button to draw
 * Uses TensorFlow.js with DTW for accurate recognition
 */
export function useGestureRecognition(options: UseGestureRecognitionOptions = {}) {
  const {
    enabled = true,
    minPoints = 8,
    gestureTimeout = 600,
    onGestureRecognized,
    actions = [],
  } = options

  const [isDrawing, setIsDrawing] = useState(false)
  const [path, setPath] = useState<Point[]>([])
  const [lastGesture, setLastGesture] = useState<GestureResult | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isShiftHeld = useRef(false)
  const isRightMouseHeld = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const recognizerRef = useRef(getGestureRecognizer())

  const getPoint = (e: MouseEvent | TouchEvent): Point | null => {
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY

    if (clientX === undefined || clientY === undefined) return null

    return {
      x: clientX,
      y: clientY,
    }
  }

  const clearGesture = useCallback(() => {
    setLastGesture(null)
    setIsDrawing(false)
    setPath([])
  }, [])

  // Use Hugging Face computer vision for gesture recognition
  const recognizeGesture = useCallback(async (points: Point[]): Promise<GestureResult> => {
    if (points.length < minPoints) {
      return { type: 'unknown', value: '', confidence: 0 }
    }

    const recognizer = recognizerRef.current

    try {
      const { gesture, confidence } = await recognizer.recognize(points)

      // If reasonable confidence, use the result
      if (confidence >= 0.3) {
        const actionGesture = mapGestureToAction(gesture)
        const type = getGestureType(gesture)
        return { type, value: actionGesture, confidence }
      }

      // Fallback: use simple direction detection
      const direction = recognizer.getDirection(points)
      if (direction !== 'none') {
        const directionMap: Record<string, string> = {
          'right': 'next',
          'left': 'prev',
          'up': 'arrow_up',
          'down': 'arrow_down'
        }
        return {
          type: 'symbol',
          value: directionMap[direction] || direction,
          confidence: 0.7
        }
      }

      return { type: 'unknown', value: '', confidence: 0 }

    } catch (error) {
      console.warn('Gesture recognition error:', error)
      return { type: 'unknown', value: '', confidence: 0 }
    }
  }, [minPoints])

  // Complete gesture and clear path
  const handleGestureComplete = useCallback(async () => {
    setPath(currentPath => {
      if (currentPath.length < minPoints) {
        setIsDrawing(false)
        return []
      }

      // Async recognition with Hugging Face
      recognizeGesture(currentPath).then(result => {
        if (result.confidence > 0.25 && result.value) {
          setLastGesture(result)

          // Defer callbacks to avoid setState during render
          setTimeout(() => {
            onGestureRecognized?.(result)

            // Execute mapped action
            const action = actions.find(a => a.gesture === result.value)
            if (action) {
              action.action()
            }
          }, 0)
        }

        setIsDrawing(false)
        return []
      }).catch(error => {
        console.warn('Gesture recognition error:', error)
        setIsDrawing(false)
      })

      return currentPath // Keep path until recognition completes
    })
  }, [minPoints, recognizeGesture, onGestureRecognized, actions])

  // Handle key events for Shift
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isShiftHeld.current) {
        isShiftHeld.current = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftHeld.current = false
        if (isDrawing) {
          handleGestureComplete()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [enabled, isDrawing, handleGestureComplete])

  // Handle mouse events
  useEffect(() => {
    if (!enabled) return

    const handleMouseDown = (e: MouseEvent) => {
      // Right click to start gesture
      if (e.button === 2) {
        e.preventDefault()
        isRightMouseHeld.current = true
        const point = getPoint(e)
        if (point) {
          setIsDrawing(true)
          setPath([point])
        }
      }
      // Shift + left click also works
      else if (e.shiftKey) {
        const point = getPoint(e)
        if (point) {
          setIsDrawing(true)
          setPath([point])
        }
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Only track if actively drawing (right mouse or shift held)
      if (!isDrawing) return
      if (!isRightMouseHeld.current && !isShiftHeld.current) return

      const point = getPoint(e)
      if (!point) return

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Add point to path (with distance threshold to avoid too many points)
      setPath(prev => {
        if (prev.length === 0) return [point]
        
        const lastPoint = prev[prev.length - 1]
        const dist = Math.sqrt(
          Math.pow(point.x - lastPoint.x, 2) + 
          Math.pow(point.y - lastPoint.y, 2)
        )
        
        // Only add if moved at least 3 pixels
        if (dist >= 3) {
          return [...prev, point]
        }
        return prev
      })

      // Set timeout for auto-complete when user pauses
      timeoutRef.current = setTimeout(() => {
        handleGestureComplete()
      }, gestureTimeout)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightMouseHeld.current = false
        if (isDrawing) {
          handleGestureComplete()
        }
      } else if (!isShiftHeld.current && isDrawing) {
        handleGestureComplete()
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent context menu when gesture mode is active
      if (isRightMouseHeld.current || isDrawing) {
        e.preventDefault()
      }
    }

    // Touch events - two finger touch to draw
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const point = getPoint(e)
        if (point) {
          setIsDrawing(true)
          setPath([point])
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDrawing) return
      
      e.preventDefault()
      const point = getPoint(e)
      if (!point) return

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      setPath(prev => [...prev, point])

      timeoutRef.current = setTimeout(() => {
        handleGestureComplete()
      }, gestureTimeout)
    }

    const handleTouchEnd = () => {
      if (isDrawing) {
        handleGestureComplete()
      }
    }

    window.addEventListener('mousedown', handleMouseDown, { capture: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true, capture: true })
    window.addEventListener('mouseup', handleMouseUp, { passive: true, capture: true })
    window.addEventListener('contextmenu', handleContextMenu, { capture: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
    window.addEventListener('touchend', handleTouchEnd, { capture: true })

    return () => {
      window.removeEventListener('mousedown', handleMouseDown, { capture: true })
      window.removeEventListener('mousemove', handleMouseMove, { capture: true })
      window.removeEventListener('mouseup', handleMouseUp, { capture: true })
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true })
      window.removeEventListener('touchstart', handleTouchStart, { capture: true })
      window.removeEventListener('touchmove', handleTouchMove, { capture: true })
      window.removeEventListener('touchend', handleTouchEnd, { capture: true })

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, isDrawing, gestureTimeout, handleGestureComplete])

  return {
    isDrawing,
    path,
    lastGesture,
    clearGesture,
    canvasRef,
  }
}
