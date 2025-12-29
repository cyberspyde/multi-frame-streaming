import { useEffect, useRef, useState, useCallback } from 'react'
import { InferenceClient } from '@huggingface/inference'

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
  onClick?: (point: Point) => void
  maxClickDuration?: number
  maxClickDistance?: number
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

/**
 * ML-powered gesture recognition hook for drawing patterns with cursor
 * Uses Hugging Face Inference API for recognition.
 */
export function useGestureRecognition(options: UseGestureRecognitionOptions = {}) {
  const {
    enabled = true,
    minPoints = 8,
    gestureTimeout = 600,
    onGestureRecognized,
    actions = [],
    onClick,
    maxClickDuration = 250,
    maxClickDistance = 10,
  } = options

  const [isDrawing, setIsDrawing] = useState(false)
  const [path, setPath] = useState<Point[]>([])
  const [lastGesture, setLastGesture] = useState<GestureResult | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isShiftHeld = useRef(false)
  const isRightMouseHeld = useRef(false)
  const mouseStartPos = useRef<Point | null>(null)
  const isExplicitDrawing = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  const [inference, setInference] = useState<InferenceClient | null>(null)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_HF_ACCESS_TOKEN) {
      setInference(new InferenceClient(process.env.NEXT_PUBLIC_HF_ACCESS_TOKEN));
      console.log("✅ Hugging Face Inference client initialized.");
    } else {
      console.warn("⚠️ Hugging Face access token not found. Please set NEXT_PUBLIC_HF_ACCESS_TOKEN in .env.local");
    }
  }, []);

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

  // Helper to convert points to an image blob
  const pointsToBlob = (points: Point[]): Promise<Blob | null> => {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null);

      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (points.length < 2) return resolve(null);

      const xs = points.map(p => p.x)
      const ys = points.map(p => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      const width = maxX - minX
      const height = maxY - minY
      
      if(width === 0 || height === 0) return resolve(null);

      const scale = Math.min((canvas.width - 40) / width, (canvas.height - 40) / height)

      ctx.strokeStyle = 'white'
      ctx.lineWidth = 10
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        const x = (p.x - minX) * scale + (canvas.width - width * scale) / 2
        const y = (p.y - minY) * scale + (canvas.height - height * scale) / 2
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      canvas.toBlob(resolve, 'image/png')
    });
  }

  // Use Hugging Face recognition
  const recognizeGesture = useCallback(async (points: Point[]): Promise<GestureResult> => {
    if (!inference) {
      console.warn("Hugging Face client not initialized.");
      return { type: 'unknown', value: '', confidence: 0 }
    }
    if (points.length < minPoints) {
      return { type: 'unknown', value: '', confidence: 0 }
    }

    const imageBlob = await pointsToBlob(points);
    if (!imageBlob) {
      return { type: 'unknown', value: '', confidence: 0 }
    }
    
    try {
      const response = await inference.imageClassification({
        data: imageBlob,
        model: 'JoshuaKelleyDs/quickdraw-ViT-base-finetune',
      });

      if (response && response.length > 0) {
        const topResult = response[0];
        const label = topResult.label.toLowerCase().replace(/ /g, '_');
        console.log('🧠 HF Raw Predictions:', response.map(x => `${x.label}: ${(x.score * 100).toFixed(1)}%`).join(', '));

        const CUSTOM_AI_MAPPINGS: Record<string, string> = {
            'bracelet': 'search',
            'circle': 'search',
            'octagon': 'search',
            'necklace': 'search',
            'diamond': 'search',
            'mountain': 'arrow_up',
            'tent': 'arrow_up',
            'zigzag': 'clear',
            'squiggle': 'clear',
            'tornado': 'clear',
            'garden_hose': 'clear',
            'line': 'clear',
            'crocodile': 'arrow_down',
            'barn': 'house',
            'church': 'house',
            'hospital': 'house',
            'castle': 'house',
        }

        const xs = points.map(p => p.x)
        const ys = points.map(p => p.y)
        const center = {
          x: (Math.min(...xs) + Math.max(...xs)) / 2,
          y: (Math.min(...ys) + Math.max(...ys)) / 2
        }

        const mappedAction = CUSTOM_AI_MAPPINGS[label] || label;
        console.log(`🎯 Mapped HF "${label}" to "${mappedAction}" at (${center.x}, ${center.y})`);
        
        return { type: 'symbol', value: mappedAction, confidence: topResult.score, center }
      }
    } catch (e) {
      console.error('Hugging Face Prediction error:', e)
    }

    return { type: 'unknown', value: '', confidence: 0 }
  }, [minPoints, inference])

  // Complete gesture and clear path
  const handleGestureComplete = useCallback(async () => {
    let currentPath: Point[] = []
    let shouldProcess = false

    setPath(prev => {
      if (prev.length >= minPoints) {
        const now = Date.now()
        const recentPoints = prev.filter(p => p.timestamp && (now - p.timestamp < 5000))

        if (recentPoints.length >= minPoints) {
          const xs = recentPoints.map(p => p.x)
          const ys = recentPoints.map(p => p.y)
          const spreadX = Math.max(...xs) - Math.min(...xs)
          const spreadY = Math.max(...ys) - Math.min(...ys)

          if (spreadX > 20 || spreadY > 20) { // Lowered threshold for smaller gestures
            currentPath = [...recentPoints]
            shouldProcess = true
          }
        }
      }
      return []
    })

    setIsDrawing(false)

    if (!shouldProcess) return

    try {
      const result = await recognizeGesture(currentPath)
      if (result.confidence > 0.1 && result.value) { // Adjusted confidence
        setLastGesture(result)

        setTimeout(() => {
          onGestureRecognized?.(result)

          const action = actions.find(a => a.gesture === result.value)
          if (action) {
            action.action()
          }
        }, 0)
      }
    } catch (error) {
      console.warn('Gesture recognition error:', error)
    }
  }, [minPoints, recognizeGesture, onGestureRecognized, actions])

  const [isShiftHeldState, setIsShiftHeldState] = useState(false)

  // Handle key events for Shift
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftHeld.current = true
        setIsShiftHeldState(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftHeld.current = false
        setIsShiftHeldState(false)
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
      if (!enabled) return;

      const point = getPoint(e);
      if (point) {
        mouseStartPos.current = { ...point, timestamp: Date.now() };
      }

      if (e.button === 2 || e.shiftKey) {
        e.preventDefault();
        if (e.button === 2) {
          isRightMouseHeld.current = true;
        }
        isExplicitDrawing.current = true;
      }
      
      if (point) {
        setIsDrawing(true);
        setPath([point]);
      }
    }

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!enabled || !isDrawing) return
      const point = getPoint(e)
      if (!point) return

      const now = Date.now()
      const newPoint = { ...point, timestamp: now }

      setPath(prev => {
        const lastPoint = prev[prev.length - 1]
        if (!lastPoint) return [newPoint]

        const dx = point.x - lastPoint.x
        const dy = point.y - lastPoint.y
        const distSq = dx * dx + dy * dy

        if (distSq >= 9) {
          return [...prev, newPoint].slice(-400)
        }
        return prev
      })

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        handleGestureComplete()
      }, gestureTimeout)
    }

    const handleMouseUp = (e: MouseEvent) => {
      const startPos = mouseStartPos.current;
      const endPoint = getPoint(e);
      
      isRightMouseHeld.current = false;
      isExplicitDrawing.current = false;
      mouseStartPos.current = null;
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      if (!isDrawing) return;

      if (startPos && endPoint && onClick) {
        const duration = Date.now() - (startPos.timestamp || 0);
        const dx = endPoint.x - startPos.x;
        const dy = endPoint.y - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (duration < maxClickDuration && distance < maxClickDistance) {
          onClick(endPoint);
          setIsDrawing(false);
          setPath([]);
          return;
        }
      }

      handleGestureComplete();
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (path.length > minPoints) {
        e.preventDefault();
      }
    }

    window.addEventListener('mousedown', handleMouseDown, { capture: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: false, capture: true })
    window.addEventListener('mouseup', handleMouseUp, { passive: true, capture: true })
    window.addEventListener('contextmenu', handleContextMenu, { capture: true })

    window.addEventListener('touchstart', handleMouseDown as any, { passive: false, capture: true })
    window.addEventListener('touchmove', handleMouseMove as any, { passive: false, capture: true })
    window.addEventListener('touchend', handleMouseUp as any, { capture: true })

    return () => {
      window.removeEventListener('mousedown', handleMouseDown, { capture: true })
      window.removeEventListener('mousemove', handleMouseMove, { capture: true })
      window.removeEventListener('mouseup', handleMouseUp, { capture: true })
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true })
      window.removeEventListener('touchstart', handleMouseDown as any, { capture: true })
      window.removeEventListener('touchmove', handleMouseMove as any, { capture: true })
      window.removeEventListener('touchend', handleMouseUp as any, { capture: true })

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, isDrawing, gestureTimeout, handleGestureComplete, onClick, maxClickDuration, maxClickDistance])

  return {
    isDrawing,
    path,
    lastGesture,
    clearGesture,
    canvasRef,
    isShiftHeld: isShiftHeldState,
  }
}