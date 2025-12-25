'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface CursorTrailProps {
  enabled: boolean
}

export function CursorTrail({ enabled }: CursorTrailProps) {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [trail, setTrail] = useState<Array<{ x: number; y: number; id: number }>>([])
  const idCounter = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setTrail([])
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX
      const y = e.clientY
      setCursorPosition({ x, y })

      // Add to trail
      setTrail(prev => {
        const newTrail = [...prev, { x, y, id: idCounter.current++ }]
        // Keep only last 15 trail points
        return newTrail.slice(-15)
      })
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [enabled])

  // Clear old trail points
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      setTrail(prev => {
        const now = Date.now()
        return prev.filter(point => now - point.id < 500)
      })
    }, 50)

    return () => clearInterval(interval)
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {/* Main Cursor */}
      <motion.div
        className="fixed w-6 h-6 -ml-3 -mt-3"
        style={{
          left: cursorPosition.x,
          top: cursorPosition.y,
        }}
        animate={{
          left: cursorPosition.x,
          top: cursorPosition.y,
        }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 200,
          mass: 0.5,
        }}
      >
        <div className="w-full h-full rounded-full bg-primary/40 border-2 border-primary animate-pulse" />
      </motion.div>

      {/* Trail Effect */}
      {trail.map((point, index) => {
        const age = Date.now() - point.id
        const opacity = Math.max(0, 1 - age / 500)
        const scale = 0.3 + (index / trail.length) * 0.7

        return (
          <motion.div
            key={point.id}
            className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-primary/30"
            style={{
              left: point.x,
              top: point.y,
              opacity,
              scale,
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.5 }}
          />
        )
      })}

      {/* Outer ring */}
      <motion.div
        className="fixed w-10 h-10 -ml-5 -mt-5 rounded-full border border-primary/20"
        style={{
          left: cursorPosition.x,
          top: cursorPosition.y,
        }}
        animate={{
          left: cursorPosition.x,
          top: cursorPosition.y,
          scale: [1, 1.2, 1],
        }}
        transition={{
          left: { type: 'spring', damping: 20, stiffness: 200 },
          top: { type: 'spring', damping: 20, stiffness: 200 },
          scale: { repeat: Infinity, duration: 2 },
        }}
      />
    </div>
  )
}
