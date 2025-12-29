'use client'

import { useState, useRef, useCallback, forwardRef, useEffect, useMemo } from "react";
import { useVideos, useSeedVideos, useLikeVideo, useDislikeVideo } from "@/hooks/use-videos";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/VideoPlayer";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { GestureOverlay } from "@/components/GestureOverlay";
import { VirtualKeyboard } from "@/components/VirtualKeyboard";
import { CursorTrail } from "@/components/CursorTrail";
import { useGestureRecognition, type GestureResult } from "@/hooks/use-gesture-recognition";
import { Loader2, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { videoSchema, type Video } from "@/shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<{ search?: string; category?: string; tags?: string; random?: boolean }>({ random: true });
  const [gestureEnabled] = useState(true);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [searchBuffer, setSearchBuffer] = useState("");

  const { data: videosData, isLoading, isError, refetch, error } = useVideos(page, 4, { ...filters, refreshKey });
  const { mutate: seed, isPending: isSeeding } = useSeedVideos();
  const { mutate: likeVideo } = useLikeVideo();
  const { mutate: dislikeVideoMutation } = useDislikeVideo();
  const { toast } = useToast();

  const [replacements, setReplacements] = useState<Record<number, Video>>({});
  const [playingStates, setPlayingStates] = useState([false, false, false, false]);

  // Reset replacements when the main data changes (e.g. page change or refresh)
  useEffect(() => {
    setReplacements({});
  }, [videosData, page, refreshKey]);

  const activeVideos = useMemo(() => {
    if (!videosData?.videos) return [];
    return (videosData.videos as Video[]).map((v: Video, i: number) => replacements[i] || v);
  }, [videosData, replacements]);

  const handleDislike = useCallback(async (videoId: string, index: number) => {
    dislikeVideoMutation(videoId);

    // Fetch a replacement
    try {
      const res = await fetch(`/api/videos?random=true&limit=1&page=1&refreshKey=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.videos && data.videos.length > 0) {
          const newVideo = data.videos[0];
          setReplacements(prev => ({ ...prev, [index]: newVideo }));
          toast({ title: "Replaced", description: `Replaced with "${newVideo.title}"` });
        }
      }
    } catch (e) {
      console.error('Failed to replace video:', e);
    }
  }, [dislikeVideoMutation, toast]);

  // Global State
  const [isMuted] = useState(true);

  // Player Refs for Global Actions
  const playerRefs = useRef<(VideoPlayerHandle | null)[]>([]);

  // Player State
  const handleTogglePlay = useCallback((index: number) => {
    setPlayingStates(prev => {
      const newStates = [...prev];
      newStates[index] = !newStates[index];
      return newStates;
    })
  }, []);


  // Actions
  const handleRandomize = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    toast({ title: "Refreshing", description: "Fetching random videos..." });
  }, [toast]);

  const handleSkipAllForward = useCallback(() => {
    playerRefs.current.forEach(player => {
      player?.seekForward();
    });
    toast({ title: "Skipped 10s", description: "Fast-forwarded all streams." });
  }, [toast]);

  const handleSearchFocus = useCallback(() => {
    setShowKeyboard(true);
    toast({ title: "Virtual Keyboard", description: "Search mode active" });
  }, [toast]);

  // Keyboard Handlers
  const handleKeyboardKeyPress = useCallback((key: string) => {
    setSearchBuffer(prev => prev + key);
  }, []);

  const handleKeyboardBackspace = useCallback(() => {
    setSearchBuffer(prev => prev.slice(0, -1));
  }, []);

  const handleKeyboardClear = useCallback(() => {
    setSearchBuffer("");
  }, []);

  const handleKeyboardSearch = useCallback(() => {
    setFilters(prev => ({ ...prev, search: searchBuffer }));
    setPage(1);
    setShowKeyboard(false);
    toast({ title: "Searching", description: `Filtering for: ${searchBuffer}` });
  }, [searchBuffer, toast]);

  const handleSearchChange = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((newFilters: { category?: string; tags?: string }) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);


  const handleTapClick = useCallback((point: { x: number, y: number }) => {
    const { x, y } = point;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // TODO: This could be more robust by getting header height dynamically
    const HEADER_HEIGHT = 70; // Approximate height of the header bar
    if (y < HEADER_HEIGHT) return; // Click is in the header, do nothing

    const isRight = x > width / 2;
    const isBottom = y > height / 2;

    let targetIndex = 0;
    if (!isRight && !isBottom) targetIndex = 0;
    else if (isRight && !isBottom) targetIndex = 1;
    else if (!isRight && isBottom) targetIndex = 2;
    else if (isRight && isBottom) targetIndex = 3;

    if (activeVideos[targetIndex]) {
      handleTogglePlay(targetIndex);
    }
  }, [activeVideos, handleTogglePlay]);


  // Gesture Recognition Setup
  const handleGestureRecognized = useCallback((result: GestureResult) => {
    console.log('Gesture recognized:', result);

    const activeVideos = videosData?.videos || [];

    // Region Based Logic
    if (result.center && ['house', 'triangle', 'arrow_down', 'x'].includes(result.value)) {
      const { x, y } = result.center;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Determine Grid Index (2x2)
      // Top row vs Bottom row (assuming header takes some height? no, main is h-screen)
      // The grid starts below the header, but let's use the layout:
      // Index 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right

      const isRight = x > width / 2;
      const isBottom = y > height / 2; // Assuming 50/50 split of viewport height

      let targetIndex = 0;
      if (!isRight && !isBottom) targetIndex = 0;
      if (isRight && !isBottom) targetIndex = 1;
      if (!isRight && isBottom) targetIndex = 2;
      if (isRight && isBottom) targetIndex = 3;

      const targetVideo = activeVideos[targetIndex];
      if (targetVideo) {
        if (result.value === 'house') {
          likeVideo(targetVideo.id);
          toast({ title: "Liked", description: `"${targetVideo.title}"` });
          return;
        } else if (result.value === 'arrow_down' || result.value === 'x') {
          handleDislike(targetVideo.id, targetIndex);
          toast({ title: "Disliked", description: `"${targetVideo.title}"` });
          return;
        }
      }
    }


    // Notification logic
    setTimeout(() => {
      toast({
        title: `Gesture: ${result.value}`,
        description: `Action Triggered`,
        duration: 1000,
      });
    }, 0);
  }, [toast, videosData, likeVideo, handleDislike]);

  const { isDrawing, path, isShiftHeld } = useGestureRecognition({
    enabled: gestureEnabled,
    onGestureRecognized: handleGestureRecognized,
    onClick: handleTapClick,
    actions: [
      {
        gesture: 'clear', // Mapped from Line/Zigzag
        action: handleSkipAllForward,
        description: 'Skip 10s',
      },
      {
        gesture: 'search', // Mapped from Circle/Bracelet
        action: handleSearchFocus,
        description: 'Search',
      },
      {
        gesture: 'arrow_up', // Mountain (User mapping)
        action: () => {
          // Maybe volume up? Or just example
          toast({ title: "Arrow Up", description: "Action placeholder" });
        },
        description: 'Up Action',
      },
      {
        gesture: 'arrow_down', // Crocodile
        action: () => {
          toast({ title: "Arrow Down", description: "Action placeholder" });
        },
        description: 'Down Action',
      },
      {
        gesture: 'next',
        action: () => setTimeout(() => handleRandomize(), 0),
        description: 'Random batch',
      },
      {
        gesture: 'prev',
        action: () => setTimeout(() => handleRandomize(), 0),
        description: 'Random batch',
      },
      // Register region based gestures in actions list too to ensure they don't fall through?
      // Actually handleGestureRecognized is enough because actions list is for global ones.
    ],
  });


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

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative scanlines">
      {/* Cursor Trail */}
      <CursorTrail enabled={gestureEnabled} />

      {/* Gesture Overlay */}
      <GestureOverlay
        isDrawing={isDrawing}
        path={path}
        enabled={gestureEnabled}
      />

      <VirtualKeyboard
        isVisible={showKeyboard}
        onClose={() => setShowKeyboard(false)}
        onKeyPress={handleKeyboardKeyPress}
        onBackspace={handleKeyboardBackspace}
        onClear={handleKeyboardClear}
        onSearch={handleKeyboardSearch}
        currentValue={searchBuffer}
      />

      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50 z-50" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background pointer-events-none -z-10" />

      <main className="w-full flex flex-col">
        {/* Compact Header (Search/Filter only) */}
        <div className="p-4 flex-none z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="flex justify-between items-center gap-4 max-w-[1800px] mx-auto w-full">
            <SearchFilterBar
              onSearchChange={handleSearchChange}
              onFilterChange={handleFilterChange}
              gestureSearch={searchBuffer}
            />
          </div>
        </div>

        <div className="p-0 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-0 h-screen">
          <AnimatePresence mode="popLayout">
            {activeVideos.length > 0 ? (
              activeVideos.map((video, idx) => (
                <VideoPlayerWrapper
                  key={`${video.id}-${page}`}
                  video={video}
                  isPlaying={playingStates[idx]}
                  isMuted={isMuted}
                  index={idx}
                  gestureEnabled={gestureEnabled}
                  isDrawing={isDrawing}
                  isShiftHeld={isShiftHeld}
                  onTogglePlay={() => handleTogglePlay(idx)}
                  videoRef={(el) => playerRefs.current[idx] = el}
                />
              ))
            ) : (
              <div className="col-span-full row-span-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
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
      </main >

      {/* MasterControls Removed as requested */}

      {/* Exit Button */}
      <div className="fixed bottom-6 right-6 z-[70]">
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all gap-2 px-6"
          onClick={() => {
            if (confirm("Are you sure you want to exit?")) {
              window.close();
              // Fallback for browsers that block window.close()
              window.location.href = "about:blank";
            }
          }}
        >
          <X className="w-5 h-5" />
          <span className="font-bold tracking-widest text-xs">EXIT</span>
        </Button>
      </div>
    </div >
  );
}

const VideoPlayerWrapper = forwardRef<HTMLDivElement, {
  video: z.infer<typeof videoSchema>,
  isPlaying: boolean,
  isMuted: boolean,
  index: number,
  gestureEnabled: boolean,
  isDrawing: boolean,
  isShiftHeld: boolean,
  videoRef: (instance: VideoPlayerHandle | null) => void
  onTogglePlay: () => void;
}>(({ video, isPlaying, isMuted, index, gestureEnabled, isDrawing, isShiftHeld, videoRef, onTogglePlay }, ref) => {

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.1 }}
      className="w-full h-full relative" // Full size
    >
      <VideoPlayer
        ref={videoRef}
        url={video.sourceUrl || undefined}
        iframe={video.iframe || undefined}
        title={video.title}
        source={video.stream?.name || 'Manual'}
        playing={isPlaying}
        muted={isMuted}
        volume={0.8}
        onTogglePlay={onTogglePlay}
        onSkip10={() => { }}
        isActive={isPlaying}
        gestureEnabled={gestureEnabled}
        isDrawing={isDrawing}
        isShiftHeld={isShiftHeld}
      />
    </motion.div>
  );
});

VideoPlayerWrapper.displayName = "VideoPlayerWrapper";