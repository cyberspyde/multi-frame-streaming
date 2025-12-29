'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Delete, Space, Search } from 'lucide-react'

interface VirtualKeyboardProps {
    isVisible: boolean
    onClose: () => void
    onKeyPress: (key: string) => void
    onBackspace: () => void
    onClear: () => void
    onSearch: () => void
    currentValue: string
}

export function VirtualKeyboard({
    isVisible,
    onClose,
    onKeyPress,
    onBackspace,
    onClear,
    onSearch,
    currentValue
}: VirtualKeyboardProps) {
    const rows = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ]

    const handleKeyClick = (key: string) => {
        // Basic haptic feedback if available
        if (window.navigator?.vibrate) {
            window.navigator.vibrate(10)
        }
        onKeyPress(key)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed bottom-0 left-0 w-full z-[200] p-4 md:p-6"
                >
                    <div className="max-w-4xl mx-auto bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                        {/* Keyboard Header */}
                        <div className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-white/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-widest text-primary font-bold opacity-70">Search Query</span>
                                <div className="text-xl font-medium text-white min-h-[1.5rem] tracking-wide">
                                    {currentValue}
                                    <motion.span
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.8 }}
                                        className="inline-block w-0.5 h-6 bg-primary ml-1 align-middle"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Keys Area */}
                        <div className="p-4 md:p-6 space-y-3">
                            {rows.map((row, rowIndex) => (
                                <div key={rowIndex} className="flex justify-center gap-2">
                                    {row.map((key) => (
                                        <Key
                                            key={key}
                                            label={key}
                                            onClick={() => handleKeyClick(key)}
                                        />
                                    ))}
                                    {rowIndex === 3 && (
                                        <Key
                                            label={<Delete className="w-5 h-5" />}
                                            onClick={onBackspace}
                                            className="w-16 md:w-20 bg-white/5 hover:bg-white/10"
                                        />
                                    )}
                                </div>
                            ))}

                            {/* Bottom Row */}
                            <div className="flex justify-center gap-2 mt-2">
                                <Key
                                    label="Clear"
                                    onClick={onClear}
                                    className="w-24 md:w-32 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/20"
                                />
                                <Key
                                    label={<Space className="w-6 h-6" />}
                                    onClick={() => handleKeyClick(' ')}
                                    className="flex-1 max-w-sm bg-white/10 hover:bg-white/20"
                                />
                                <button
                                    onClick={onSearch}
                                    className="w-24 md:w-32 h-12 md:h-14 rounded-xl flex items-center justify-center bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Search className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function Key({
    label,
    onClick,
    className = ""
}: {
    label: string | React.ReactNode,
    onClick: () => void,
    className?: string
}) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`
        h-12 md:h-14 min-w-[3rem] md:min-w-[4rem] px-2 rounded-xl
        flex items-center justify-center
        text-lg font-medium text-white
        bg-white/10 border border-white/10
        hover:bg-white/20 transition-all
        ${className}
      `}
        >
            {label}
        </motion.button>
    )
}
