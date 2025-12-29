'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface Point {
  x: number
  y: number
  timestamp?: number
}

interface GestureOverlayProps {
  isDrawing: boolean
  path: Point[]
  enabled: boolean
}

export function GestureOverlay({ isDrawing, path, enabled }: GestureOverlayProps) {
  const [fadingPath, setFadingPath] = useState<Point[]>([])

  // Show fading path effect after drawing stops
  useEffect(() => {
    if (!isDrawing && path.length > 0) {
      setFadingPath(path)
      const timer = setTimeout(() => setFadingPath([]), 300)
      return () => clearTimeout(timer)
    }
  }, [isDrawing, path])


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

    </>
  )
}
