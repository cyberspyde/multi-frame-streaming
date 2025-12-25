'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { GestureResult } from '@/hooks/use-gesture-recognition'

interface Point {
  x: number
  y: number
  timestamp?: number
}

interface GestureOverlayProps {
  isDrawing: boolean
  path: Point[]
  lastGesture: GestureResult | null
  enabled: boolean
}

export function GestureOverlay({ isDrawing, path, lastGesture, enabled }: GestureOverlayProps) {
  const [showResult, setShowResult] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [fadingPath, setFadingPath] = useState<Point[]>([])

  // Show fading path effect after drawing stops
  useEffect(() => {
    if (!isDrawing && path.length > 0) {
      setFadingPath(path)
      const timer = setTimeout(() => setFadingPath([]), 300)
      return () => clearTimeout(timer)
    }
  }, [isDrawing, path])

  useEffect(() => {
    if (lastGesture && lastGesture.confidence > 0.5) {
      setShowResult(true)
      setShowHint(false)
      const timer = setTimeout(() => setShowResult(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastGesture])

  useEffect(() => {
    if (enabled) {
      setShowHint(true)
      const timer = setTimeout(() => setShowHint(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [enabled])

  if (!enabled) return null

  // Show either active path or fading path
  const displayPath = isDrawing ? path : fadingPath
  const pathOpacity = isDrawing ? 1 : 0.3

  return (
    <>
      {/* Drawing Canvas - pointer-events-none so it doesn't block clicks */}
      <svg
        className="fixed inset-0 pointer-events-none z-[100]"
        style={{ width: '100vw', height: '100vh' }}
      >
        <AnimatePresence>
          {displayPath.length > 1 && (
            <motion.polyline
              key="gesture-path"
              initial={{ opacity: 0 }}
              animate={{ opacity: pathOpacity }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              points={displayPath.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(236, 72, 153, 0.8)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.8))',
              }}
            />
          )}
        </AnimatePresence>

        {/* Draw points for better visibility while drawing */}
        {isDrawing && path.slice(-20).map((point, i) => (
          <circle
            key={`point-${i}`}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="rgba(236, 72, 153, 0.8)"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(236, 72, 153, 0.6))',
            }}
          />
        ))}
      </svg>

      {/* Gesture Result Display */}
      <AnimatePresence>
        {showResult && lastGesture && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed top-20 right-8 z-[100] pointer-events-none"
          >
            <div className="bg-gradient-to-br from-primary/90 to-pink-600/90 backdrop-blur-sm text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/20">
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold">
                  {lastGesture.type === 'number' && lastGesture.value}
                  {lastGesture.type === 'letter' && lastGesture.value}
                  {lastGesture.type === 'symbol' && getSymbolIcon(lastGesture.value)}
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-semibold">
                    {getGestureLabel(lastGesture)}
                  </div>
                  <div className="text-xs opacity-75">
                    {Math.round(lastGesture.confidence * 100)}% confidence
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gesture Mode Indicator */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-8 right-8 z-[100] pointer-events-none"
          >
            <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium border border-primary/30 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isDrawing ? 'bg-green-400 animate-pulse' : 'bg-primary'}`} />
              <span>Gesture Mode</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helpful Hint */}
      <AnimatePresence>
        {enabled && showHint && !isDrawing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-8 z-[100] pointer-events-none max-w-xs"
          >
            <div className="bg-gradient-to-br from-primary/90 to-pink-600/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-2xl border border-white/20">
              <div className="text-xs font-semibold mb-1">💡 Gesture Controls</div>
              <div className="text-xs opacity-90">
                <strong>Right-click + drag</strong> or <strong>Shift + drag</strong> to draw!<br />
                • Swipe right → Next page<br />
                • Swipe left → Previous page<br />
                • Draw circle → Search<br />
                <span className="text-[10px] opacity-75">Release to recognize gesture</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function getSymbolIcon(value: string) {
  switch (value) {
    case 'next':
      return '→'
    case 'prev':
      return '←'
    case 'search':
      return '🔍'
    default:
      return value
  }
}

function getGestureLabel(gesture: GestureResult) {
  if (gesture.type === 'number') {
    return `Number ${gesture.value}`
  }
  if (gesture.type === 'letter') {
    return `Letter ${gesture.value}`
  }
  if (gesture.type === 'symbol') {
    switch (gesture.value) {
      case 'next':
        return 'Next Page'
      case 'prev':
        return 'Previous Page'
      case 'search':
        return 'Search'
      default:
        return gesture.value
    }
  }
  return 'Unknown'
}
