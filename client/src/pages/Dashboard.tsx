import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useVideos, useSeedVideos } from "@/hooks/use-videos";
import { VideoPlayer } from "@/components/VideoPlayer";
import { MasterControls } from "@/components/MasterControls";
import { Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const { data: videos, isLoading, isError, refetch } = useVideos(page, 4);
  const { mutate: seed, isPending: isSeeding } = useSeedVideos();
  const { toast } = useToast();

  // Global State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Track individual player refs for seeking if needed, or trigger via state change timestamp
  const [skipTrigger, setSkipTrigger] = useState(0);

  // Initial seed check
  useEffect(() => {
    // If we have an empty array and not loading, we might need to seed
    if (!isLoading && videos && videos.length === 0) {
      seed(undefined, {
        onSuccess: () => {
          toast({
            title: "Simulation Started",
            description: "Loaded sample video streams.",
          });
        }
      });
    }
  }, [videos, isLoading, seed, toast]);

  // Debounce handler to prevent accidental double-clicks
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

  // Preload next batch in background
  const { data: nextBatchData } = useVideos(page + 1, 4);
  useEffect(() => {
    // Silently preload next page for faster navigation
    if (nextBatchData) {
      // Data is already cached by react-query
    }
  }, [nextBatchData]);

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
        <button
          onClick={() => refetch()}
          className="text-white bg-zinc-800 px-4 py-2 rounded-md hover:bg-zinc-700"
        >
          RETRY
        </button>
      </div>
    );
  }

  const activeVideos = videos || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 overflow-x-hidden relative scanlines">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50 z-50" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background pointer-events-none -z-10" />

      <main className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8 h-full">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic glow-text">
              HYPER<span className="text-primary">STREAM</span>
            </h1>
            <p className="text-zinc-500 font-mono mt-2 text-sm">
              /// SIMULATION MODE // BATCH_ID: {page.toString().padStart(4, '0')}
            </p>
          </div>
          <div className="hidden md:block text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              LIVE CONNECTION
            </div>
          </div>
        </header>

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
                <p className="text-zinc-500 mb-4">No signal detected.</p>
                <button
                  onClick={() => seed()}
                  disabled={isSeeding}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  {isSeeding ? "INITIALIZING..." : "START SIMULATION"}
                </button>
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

// Optimized wrapper with motion
const VideoPlayerWrapper = ({ video, isPlaying, isMuted, index }: { video: any, isPlaying: boolean, isMuted: boolean, index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.1 }}
      className="w-full h-full min-h-[300px] md:min-h-[auto]"
    >
      <VideoPlayer
        url={video.url}
        title={video.title}
        source={video.source}
        playing={isPlaying}
        muted={isMuted}
        volume={0.8}
        onTogglePlay={() => { }}
        onSkip10={() => { }}
        isActive={isPlaying}
      />
    </motion.div>
  );
};
