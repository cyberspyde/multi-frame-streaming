# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

A Next.js application for monitoring multiple video streams simultaneously in a responsive grid layout. Built to handle 6M+ video records with optimized database queries, intelligent caching, and performance monitoring.

**Author:** cyberspyde

## Common Commands

### Development
```bash
npm run dev          # Start Next.js development server on port 3005
npm run build        # Build production bundle
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database Operations
```bash
npm run db:generate  # Generate Prisma client from schema
npm run db:push      # Push schema changes to database (no migration files)
npm run db:migrate   # Create and run migrations (preferred for production)
npm run db:studio    # Open Prisma Studio GUI for database inspection
```

**Important:** Always run `npm run db:generate` after modifying `prisma/schema.prisma` before running the app.

### Environment Setup
Required environment variables in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
PORT=5050  # Optional, defaults to 3005
```

## Architecture Overview

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **State Management:** TanStack Query (React Query)
- **UI:** Radix UI primitives + Shadcn UI + Tailwind CSS
- **Animations:** Framer Motion
- **Video:** React Player
- **ML:** TensorFlow.js + Hugging Face Inference API (gesture recognition)

### Directory Structure

```
app/
  api/              # Next.js API routes
    videos/         # Video CRUD endpoints
    streams/        # Stream management endpoints
    gesture/        # Gesture recognition endpoint
    scrape/         # Web scraping endpoint (ytdlp or legacy modes)
  page.tsx          # Main dashboard page (client component)
  layout.tsx        # Root layout with theme provider
  providers.tsx     # React Query provider setup
  
components/
  ui/               # Shadcn UI components
  VideoPlayer.tsx   # Individual video player with controls
  MasterControls.tsx # Global playback controls
  SearchFilterBar.tsx # Search and filter interface
  GestureOverlay.tsx # Gesture recognition visualization
  CursorTrail.tsx   # Cursor trail effects
  
hooks/
  use-videos.ts     # React Query hooks for video operations
  use-gesture-recognition.ts # ML-powered gesture detection
  use-toast.ts      # Toast notification hook
  
lib/
  prisma.ts         # Prisma client with connection pooling
  query-cache.ts    # In-memory query cache with TTL
  performance-monitor.ts # Performance tracking utilities
  gesture-recognizer.ts # ML gesture recognition engine
  queryClient.ts    # TanStack Query client config
  
prisma/
  schema.prisma     # Database schema with performance indexes
  
shared/
  schema.ts         # Zod schemas for type-safe API validation
  routes.ts         # Type-safe API route definitions
```

### Key Architecture Patterns

#### 1. Performance Optimization for Large Datasets (6M+ Records)
The application is optimized for handling millions of video records:

**Database Indexes** (prisma/schema.prisma):
- Composite indexes on `category + createdAt`, `tags + createdAt`, etc.
- Descending indexes on `views`, `likes`, `createdAt`
- These indexes MUST be maintained when adding new query patterns

**Query Optimization** (app/api/videos/route.ts):
- Cursor-based pagination (not offset-based) for better performance at scale
- Cached count queries to avoid expensive COUNT(*) operations
- `startsWith` instead of `contains` for title searches (better index usage)
- Exact matches for category/tags when possible

**Caching Strategy** (lib/query-cache.ts):
- In-memory cache with TTL (5 minutes default)
- Cache invalidation on mutations
- Separate cache keys for lists, counts, and single entities
- Cache statistics tracking via `cacheMonitor`

#### 2. Type-Safe API Layer
The `shared/` directory defines a contract between frontend and backend:

**shared/schema.ts**: Zod schemas for runtime validation
**shared/routes.ts**: Type-safe route definitions with input/output schemas

When adding new API endpoints:
1. Define Zod schemas in `shared/schema.ts`
2. Add route definition to `shared/routes.ts`
3. Implement route handler in `app/api/*/route.ts`
4. Create React Query hooks in `hooks/use-*.ts`

#### 3. React Query (TanStack Query) Pattern
All data fetching uses React Query hooks in `hooks/`:

```typescript
// Pattern for queries
export function useVideos(page, limit, filters) {
  return useQuery({
    queryKey: [api.videos.list.path, { page, limit, ...filters }],
    queryFn: async () => { /* fetch logic */ },
    placeholderData: (prev) => prev, // Keep previous data during refetch
  })
}

// Pattern for mutations
export function useSeedVideos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => { /* mutation logic */ },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] })
    },
  })
}
```

#### 4. Gesture Recognition System
The app includes ML-powered gesture recognition for mouse/touch interactions:

**Trigger:** Drawing is activated by holding Shift key or moving mouse
**Recognition:** TensorFlow.js + Hugging Face models recognize numbers, letters, symbols
**Actions:** Map gestures to app actions (e.g., '2' = next page, 'circle' = search)

Located in:
- `hooks/use-gesture-recognition.ts` - React hook interface
- `lib/gesture-recognizer.ts` - ML recognition engine
- `components/GestureOverlay.tsx` - Visual feedback

#### 5. Performance Monitoring
Built-in performance tracking via `lib/performance-monitor.ts`:

**Metrics tracked:**
- Query duration (average, P95)
- Cache hit rates
- Slow queries (>1s threshold)
- Database connection pool status

**Access stats:**
```typescript
import { performanceMonitor, cacheMonitor } from '@/lib/performance-monitor'
const stats = performanceMonitor.getStats()
const cacheStats = cacheMonitor.getStats()
```

## Development Guidelines

### Adding New Features

**New API Endpoint:**
1. Add Zod schema to `shared/schema.ts`
2. Define route in `shared/routes.ts`
3. Create route handler in `app/api/[feature]/route.ts`
4. Add React Query hooks in `hooks/use-[feature].ts`
5. Update cache invalidation if needed

**New UI Component:**
- Use existing Radix UI primitives from `components/ui/`
- Follow client/server component patterns (use 'use client' when needed)
- Prefer Tailwind CSS for styling (see `tailwind.config.ts` for custom theme)

**Database Schema Changes:**
1. Modify `prisma/schema.prisma`
2. Run `npm run db:push` (dev) or `npm run db:migrate` (production)
3. Run `npm run db:generate` to update Prisma Client
4. Update corresponding Zod schemas in `shared/schema.ts`
5. Consider performance: add indexes for frequently queried fields

### Path Aliases
Uses `@/*` to reference root directory:
```typescript
import { prisma } from '@/lib/prisma'
import { useVideos } from '@/hooks/use-videos'
```

### Styling Approach
- **Tailwind CSS** for utility classes
- **CSS Variables** for theme colors (see `app/globals.css`)
- **cn()** utility from `lib/utils.ts` for conditional classes
- **Framer Motion** for animations (see page.tsx for examples)

### Database Considerations
- Prisma uses connection pooling (configured in `lib/prisma.ts`)
- Always use proper indexes when querying large tables
- Use cursor-based pagination for `Video` table (6M+ records)
- Cache expensive COUNT queries
- Test query performance via `performance-monitor` logs

### Client vs Server Components
- **Server Components** (default): Use for static content, data fetching
- **Client Components** ('use client'): Required for:
  - Hooks (useState, useEffect, custom hooks)
  - Event handlers
  - Browser APIs
  - Context providers

Main dashboard (`app/page.tsx`) is a client component because it uses state and TanStack Query.

## Testing & Debugging

### Database Inspection
```bash
npm run db:studio  # Opens Prisma Studio on http://localhost:5555
```

### Performance Debugging
- Check console for slow query warnings (>1s)
- Performance stats logged every 60 seconds
- Cache hit rates tracked in `query-cache.ts`
- Use `performance-monitor.export()` for detailed metrics

### Common Issues

**"Prisma Client not initialized":**
- Run `npm run db:generate`

**Slow queries:**
- Check if indexes exist for query fields in schema.prisma
- Verify cursor-based pagination is used (not skip/take)
- Check cache hit rates

**Development server not hot-reloading:**
- Restart with `npm run dev`
- Check for TypeScript errors

## Code Style

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint with Next.js config (run `npm run lint`)
- **Formatting:** Follow existing patterns
- **Naming:**
  - Components: PascalCase
  - Hooks: camelCase with `use` prefix
  - API routes: kebab-case directories
  - Files: Match export name

## Performance Best Practices

1. **Always use query cache:** Check `query-cache.ts` patterns before hitting database
2. **Invalidate caches carefully:** Use `videoCache.invalidateAll()` after mutations
3. **Avoid N+1 queries:** Use Prisma `include` for relations
4. **Index everything you query:** Especially for WHERE, ORDER BY clauses
5. **Monitor performance:** Check logs for slow queries and cache miss rates
6. **Use cursor pagination:** For Video table with millions of records
7. **Lazy load components:** Use dynamic imports for heavy components
