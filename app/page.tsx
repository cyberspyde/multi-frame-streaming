'use client'

import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { useVideos, useSeedVideos, useAddVideo, useClearVideos } from "@/hooks/use-videos";
import { VideoPlayer } from "@/components/VideoPlayer";
import { MasterControls } from "@/components/MasterControls";
import { Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const { data: videosData, isLoading, isError, refetch } = useVideos(page, 4);
  const { mutate: seed, isPending: isSeeding } = useSeedVideos();
  const { mutate: addVideo, isPending: isAdding } = useAddVideo();
  const { mutate: clearVideos } = useClearVideos();
  const { toast } = useToast();

  // New Stream Form State
  const [newStreamUrl, setNewStreamUrl] = useState("");
  const [newStreamTitle, setNewStreamTitle] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Global State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const handleAddStream = () => {
    if (!newStreamUrl || !newStreamTitle) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and a URL.",
        variant: "destructive",
      });
      return;
    }

    addVideo(
      { title: newStreamTitle, url: newStreamUrl.trim(), source: "custom", thumbnail: "", duration: "" },
      {
        onSuccess: () => {
          toast({
            title: "Stream Added",
            description: "New video stream has been added to your dashboard.",
          });
          setNewStreamUrl("");
          setNewStreamTitle("");
          setIsDialogOpen(false);
          refetch();
        },
        onError: (err: any) => {
          toast({
            title: "Error",
            description: err instanceof Error ? err.message : "Failed to add stream. Ensure it's a valid URL.",
            variant: "destructive",
          });
        },
      }
    );
  };

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
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50 z-50" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background pointer-events-none -z-10" />

      <main className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8 h-full">
        <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic glow-text">
              HYPER<span className="text-primary">STREAM</span>
            </h1>
            <p className="text-zinc-500 font-mono mt-2 text-sm">
              /// {activeVideos.length > 0 ? 'SIMULATION MODE' : 'STANDBY MODE'} // BATCH_ID: {page.toString().padStart(4, '0')}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
                  <Plus className="w-4 h-4" /> Add Stream
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold italic tracking-tight">MANUAL UPLINK</DialogTitle>
                  <DialogDescription className="text-zinc-500 text-xs font-mono">
                    Enter the details of the remote stream to establish a new connection.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title" className="text-zinc-400">Stream Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Security Feed 01"
                      value={newStreamTitle}
                      onChange={(e) => setNewStreamTitle(e.target.value)}
                      className="bg-zinc-900 border-zinc-800"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="url" className="text-zinc-400">Video Link (YouTube, mp4, m3u8, etc)</Label>
                    <Input
                      id="url"
                      placeholder="https://youtube.com/watch?v=... or https://site.com/video.mp4"
                      value={newStreamUrl}
                      onChange={(e) => setNewStreamUrl(e.target.value)}
                      className="bg-zinc-900 border-zinc-800"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddStream} disabled={isAdding} className="w-full bg-primary hover:bg-primary/90">
                    {isAdding ? "CONNECTING..." : "ACTIVATE STREAM"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" onClick={handleClearAll} className="text-zinc-600 hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-5 h-5" />
            </Button>
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

const VideoPlayerWrapper = forwardRef(({ video, isPlaying, isMuted, index }: { video: any, isPlaying: boolean, isMuted: boolean, index: number }, ref: any) => {
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
        url={video.sourceUrl}
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