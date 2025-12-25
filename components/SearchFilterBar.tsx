'use client'

import { useState, useEffect } from 'react'
import { Search, X, Filter, Sparkles } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import { Label } from './ui/label'

interface SearchFilterBarProps {
  onSearchChange: (search: string) => void
  onFilterChange: (filters: { category?: string; tags?: string }) => void
  gestureSearch?: string
}

export function SearchFilterBar({ onSearchChange, onFilterChange, gestureSearch }: SearchFilterBarProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Handle gesture-triggered search
  useEffect(() => {
    if (gestureSearch) {
      setSearch(gestureSearch)
      onSearchChange(gestureSearch)
    }
  }, [gestureSearch, onSearchChange])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange(value)
  }

  const handleFilterApply = () => {
    onFilterChange({ category, tags })
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setCategory('')
    setTags('')
    onFilterChange({ category: '', tags: '' })
  }

  const hasActiveFilters = category || tags

  return (
    <div className="w-full mb-6">
      <div className="flex gap-3 items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search videos, tags, performers..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10 h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary transition-all"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {gestureSearch && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-2 -top-2 bg-primary rounded-full p-1"
            >
              <Sparkles className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </div>

        {/* Filter Popover */}
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button
              variant={hasActiveFilters ? 'default' : 'outline'}
              size="icon"
              className="h-11 w-11 relative"
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filters</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-auto p-1 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="category" className="text-xs">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., HD, 4K, Premium"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="tags" className="text-xs">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="e.g., featured, popular"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <Button
                onClick={handleFilterApply}
                className="w-full"
                size="sm"
              >
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 mt-3 flex-wrap"
          >
            {category && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                <span>Category: {category}</span>
                <button
                  onClick={() => {
                    setCategory('')
                    onFilterChange({ category: '', tags })
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {tags && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                <span>Tags: {tags}</span>
                <button
                  onClick={() => {
                    setTags('')
                    onFilterChange({ category, tags: '' })
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
