'use client'

import { useState, useRef, useCallback, forwardRef, useEffect } from "react";
import { useVideos, useSeedVideos, useClearVideos } from "@/hooks/use-videos";
import { VideoPlayer } from "@/components/VideoPlayer";
import { MasterControls } from "@/components/MasterControls";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { GestureOverlay } from "@/components/GestureOverlay";
import { CursorTrail } from "@/components/CursorTrail";
import { useGestureRecognition, type GestureResult } from "@/hooks/use-gesture-recognition";
import { Loader2, AlertCircle, Trash2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { videoSchema } from "@/shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ search?: string; category?: string; tags?: string }>({});
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [gestureSearch, setGestureSearch] = useState<string | undefined>();
  
  const { data: videosData, isLoading, isError, refetch, error } = useVideos(page, 4, filters);
  const { mutate: seed, isPending: isSeeding } = useSeedVideos();
  const { mutate: clearVideos } = useClearVideos();
  const { toast } = useToast();

  // Global State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Gesture Recognition Setup
  const handleGestureRecognized = useCallback((result: GestureResult) => {
    console.log('Gesture recognized:', result);
    
    // Use setTimeout to avoid setState during render
    setTimeout(() => {
      toast({
        title: `Gesture: ${result.value}`,
        description: `Recognized with ${Math.round(result.confidence * 100)}% confidence`,
        duration: 2000,
      });
    }, 0);
  }, [toast]);

  const { isDrawing, path, lastGesture, clearGesture } = useGestureRecognition({
    enabled: gestureEnabled,
    onGestureRecognized: handleGestureRecognized,
    actions: [
      {
        gesture: '2',
        action: () => {
          setTimeout(() => {
            setPage(p => p + 1);
            toast({ title: 'Next Batch', description: 'Moving to next page' });
          }, 0);
        },
        description: 'Next batch',
      },
      {
        gesture: '1',
        action: () => {
          setTimeout(() => {
            setPage(p => Math.max(1, p - 1));
            toast({ title: 'Previous Batch', description: 'Moving to previous page' });
          }, 0);
        },
        description: 'Previous batch',
      },
      {
        gesture: 'search',
        action: () => {
          setTimeout(() => {
            setGestureSearch('');
            const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            input?.focus();
            toast({ title: 'Search', description: 'Search activated' });
          }, 0);
        },
        description: 'Activate search',
      },
      {
        gesture: 'next',
        action: () => {
          setTimeout(() => setPage(p => p + 1), 0);
        },
        description: 'Next page',
      },
      {
        gesture: 'prev',
        action: () => {
          setTimeout(() => setPage(p => Math.max(1, p - 1)), 0);
        },
        description: 'Previous page',
      },
    ],
  });

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear ALL streams?")) {
      clearVideos(undefined, {
        onSuccess: () => {
          toast({
            title: "Dashboard Cleared",
            description: "All streams have been removed.",
          });
          refetch();
        },
      });
    }
  };

  // Debounce handler
  const debounceRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const debounce = useCallback((key: string, fn: () => void, delay = 300) => {
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(fn, delay);
  }, []);

  const handleNextBatch = useCallback(() => {
    debounce('next-batch', () => {
      setPage(p => p + 1);
      setIsPlaying(true);
    }, 200);
  }, [debounce]);

  const handleSkipAll = useCallback(() => {
    debounce('skip-all', () => {
      document.dispatchEvent(new CustomEvent('global-skip'));
      toast({
        title: "Skipped 10s",
        description: "Fast-forwarded all active streams.",
        duration: 1000,
      });
    }, 200);
  }, [debounce, toast]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-zinc-500 font-mono animate-pulse">ESTABLISHING UPLINK...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-4 text-destructive">
        <AlertCircle className="w-12 h-12" />
        <p className="font-mono">CONNECTION FAILURE</p>
        {error instanceof Error && (
          <p className="text-xs text-zinc-500 max-w-md text-center">{error.message}</p>
        )}
        <button
          onClick={() => refetch()}
          className="text-white bg-zinc-800 px-4 py-2 rounded-md hover:bg-zinc-700"
        >
          RETRY
        </button>
      </div>
    );
  }

  const activeVideos = videosData?.videos || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 overflow-x-hidden relative scanlines">
      {/* Cursor Trail */}
      <CursorTrail enabled={gestureEnabled} />
      
      {/* Gesture Overlay */}
      <GestureOverlay
        isDrawing={isDrawing}
        path={path}
        lastGesture={lastGesture}
        enabled={gestureEnabled}
      />

      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50 z-50" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background pointer-events-none -z-10" />

      <main className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8 h-full">
        {/* Header with Actions */}
        <div className="mb-6 flex justify-between items-center gap-4">
          <div className="flex gap-2">
            {/* Add Stream button removed */}
          </div>
        </div>

        {/* Search and Filter Bar with Gesture Toggle */}
        <div className="mb-6 flex justify-between items-center gap-4">
          <SearchFilterBar
            onSearchChange={(search) => {
              setFilters(prev => ({ ...prev, search }));
              setPage(1);
            }}
            onFilterChange={(newFilters) => {
              setFilters(prev => ({ ...prev, ...newFilters }));
              setPage(1);
            }}
            gestureSearch={gestureSearch}
          />

          {/* Gesture Mode Toggle */}
          <Button
            variant={gestureEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setGestureEnabled(!gestureEnabled)
              toast({
                title: !gestureEnabled ? "Gesture Mode Enabled" : "Gesture Mode Disabled",
                description: !gestureEnabled 
                  ? "Just move your mouse to draw! Pause to recognize the gesture." 
                  : "Gesture recognition disabled",
                duration: 3000,
              })
            }}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {gestureEnabled ? "Gesture Mode ON" : "Enable Gestures"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9]">
          <AnimatePresence mode="popLayout">
            {activeVideos.length > 0 ? (
              activeVideos.map((video, idx) => (
                <VideoPlayerWrapper
                  key={`${video.id}-${page}`}
                  video={video}
                  isPlaying={isPlaying}
                  isMuted={isMuted}
                  index={idx}
                />
              ))
            ) : (
              <div className="col-span-full h-96 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                <p className="text-zinc-500 mb-4 font-mono">NO SIGNAL DETECTED. AWAITING INPUT.</p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => seed()}
                    disabled={isSeeding}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isSeeding ? "INITIALIZING..." : "RESTORE DEFAULTS"}
                  </Button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <MasterControls
        currentPage={page}
        isPlayingAll={isPlaying}
        isMuted={isMuted}
        onPlayAll={() => setIsPlaying(true)}
        onPauseAll={() => setIsPlaying(false)}
        onNextBatch={handleNextBatch}
        onReset={() => {
          setIsPlaying(false);
          setPage(1);
          refetch();
        }}
        onMuteAll={setIsMuted}
        onSkipAll={handleSkipAll}
      />
    </div>
  );
}

const VideoPlayerWrapper = forwardRef<HTMLDivElement, { video: z.infer<typeof videoSchema>, isPlaying: boolean, isMuted: boolean, index: number }>(({ video, isPlaying, isMuted, index }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.1 }}
      className="w-full h-full min-h-[300px] md:min-h-[auto]"
    >
      <VideoPlayer
        url={video.sourceUrl || undefined}
        iframe={video.iframe || undefined}
        title={video.title}
        source={video.stream?.name || 'Manual'}
        playing={isPlaying}
        muted={isMuted}
        volume={0.8}
        onTogglePlay={() => { }}
        onSkip10={() => { }}
        isActive={isPlaying}
      />
    </motion.div>
  );
});

VideoPlayerWrapper.displayName = "VideoPlayerWrapper";