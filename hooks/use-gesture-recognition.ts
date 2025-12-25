import { useEffect, useRef, useState, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'
import { getGestureRecognizer } from '@/lib/gesture-recognizer'
import { QUICKDRAW_LABELS } from '@/lib/quickdraw-labels'

interface Point {
  x: number
  y: number
  timestamp?: number
}

export interface GestureResult {
  type: 'number' | 'letter' | 'symbol' | 'unknown'
  value: string
  confidence: number
  center?: Point
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
  if (['circle', 'check', 'x', 'arrow_right', 'arrow_left', 'arrow_up', 'arrow_down', 'triangle', 'square', 'star', 'search', 'next', 'prev', 'house'].includes(gesture)) {
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

  // TFJS Model State
  const [model, setModel] = useState<tf.LayersModel | null>(null)
  const [modelError, setModelError] = useState(false)

  // Load TFJS Model
  useEffect(() => {
    async function loadModel() {
      try {
        const loadedModel = await tf.loadLayersModel('/models/quickdraw-model.json')
        // Warmup
        loadedModel.predict(tf.zeros([1, 28, 28, 1]))
        setModel(loadedModel)
        console.log('✅ TFJS Model loaded successfully')
      } catch (err) {
        console.warn('⚠️ Could not load remote TFJS model, falling back to $1 algorithm:', err)
        setModelError(true)
      }
    }
    loadModel()

    return () => {
      // Cleanup model if unmounting
      // proper cleanup is complex with react strict mode, letting GC handle it usually fine for single model app
    }
  }, [])

  // Helper to convert points to tensor
  const pointsToTensor = async (points: Point[]): Promise<tf.Tensor4D | null> => {
    // create offscreen canvas
    const canvas = document.createElement('canvas')
    canvas.width = 280
    canvas.height = 280
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Draw background
    ctx.fillStyle = 'black' // Model trained on black bg? QuickDraw is usually white bg black stroke.
    // The user snippet said: "Normalize: invert colors (black bg, white stroke)" so let's stick to black bg with white stroke as common for MNIST-like inputs
    ctx.fillRect(0, 0, 280, 280)

    // Draw path
    if (points.length < 2) return null

    // Normalize points to center and scale
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const width = maxX - minX
    const height = maxY - minY
    const scale = Math.min(200 / width, 200 / height) // Scale to fit in 200x200 box (leaving margin)

    ctx.strokeStyle = 'white'
    ctx.lineWidth = 15
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]

      const x1 = (p1.x - minX) * scale + 40 + (200 - width * scale) / 2
      const y1 = (p1.y - minY) * scale + 40 + (200 - height * scale) / 2
      const x2 = (p2.x - minX) * scale + 40 + (200 - width * scale) / 2
      const y2 = (p2.y - minY) * scale + 40 + (200 - height * scale) / 2

      if (i === 0) ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()

    // Convert to Tensor
    return tf.tidy(() => {
      let tensor = tf.browser.fromPixels(canvas, 1)
      tensor = tf.image.resizeBilinear(tensor, [28, 28])

      // Normalize to [0, 1]
      // Canvas is Black bg (0), White stroke (255)
      // We want to pass 0-1 float values where 1 is the stroke (white)
      tensor = tensor.div(255.0)

      return tensor.expandDims(0) as tf.Tensor4D
    })
  }

  // Use Hybrid recognition
  const recognizeGesture = useCallback(async (points: Point[]): Promise<GestureResult> => {
    if (points.length < minPoints) {
      return { type: 'unknown', value: '', confidence: 0 }
    }

    // 2. Pure AI Label Mapping (No manual calculations)
    if (model) {
      try {
        const tensor = await pointsToTensor(points)
        if (tensor) {
          const prediction = model.predict(tensor) as tf.Tensor
          const values = await prediction.data()

          // Get top 3 results
          const indices = Array.from(values).map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p).slice(0, 3)
          const topResult = indices[0]
          const label = QUICKDRAW_LABELS[topResult.i]

          console.log('🧠 AI Raw Predictions:', indices.map(x => `${QUICKDRAW_LABELS[x.i]}: ${(x.p * 100).toFixed(1)}%`).join(', '))

          tf.dispose([tensor, prediction]) // Cleanup

          // Mappings based on User Request + Common misclassifications
          const CUSTOM_AI_MAPPINGS: Record<string, string> = {
            // Search Mappings
            'bracelet': 'search',
            'circle': 'search',
            'octagon': 'search',
            'necklace': 'search',
            'diamond': 'search', // sometimes circles look like diamonds

            // Navigation / Action Mappings
            'mountain': 'arrow_up',  // User suggestion
            'tent': 'arrow_up',      // Looks like mountain
            'triangle': 'arrow_up',

            'zigzag': 'clear',
            'squiggle': 'clear',
            'tornado': 'clear',
            'garden_hose': 'clear',
            'line': 'clear',

            // Trying to map other directions if possible?
            // 'leg' -> down? 'snake' -> right? 
            // Leaving strictly to user request for now.
            'crocodile': 'arrow_down', // From logs: Down swipe was crocodile

            // Region Based Actions
            'house': 'house',
            'triangle': 'triangle',
          }

          // Calculate center of the path
          const xs = points.map(p => p.x)
          const ys = points.map(p => p.y)
          const center = {
            x: (Math.min(...xs) + Math.max(...xs)) / 2,
            y: (Math.min(...ys) + Math.max(...ys)) / 2
          }

          if (topResult.p > 0.1) { // Very permissive threshold as requested ("lets use that")
            const mappedAction = CUSTOM_AI_MAPPINGS[label] || label
            console.log(`🎯 Mapped AI "${label}" to "${mappedAction}" at (${center.x}, ${center.y})`)
            return { type: 'symbol', value: mappedAction, confidence: topResult.p, center }
          }
        }
      } catch (e) {
        console.error('AI Prediction error:', e)
      }
    }

    // 3. Fallback removed as requested ("don't run any other predictions or calculations")
    // Use strictly the AI model's output.

    return { type: 'unknown', value: '', confidence: 0 }
  }, [minPoints, model])

  // Complete gesture and clear path
  const handleGestureComplete = useCallback(async () => {
    setPath(currentPath => {
      if (currentPath.length < minPoints) {
        setIsDrawing(false)
        return []
      }

      // Async recognition
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
        } else {
          // Show AI guess if available even if not actionable?
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
