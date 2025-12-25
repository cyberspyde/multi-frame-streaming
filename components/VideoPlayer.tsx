import { useRef, useState, useEffect, memo } from "react";
import ReactPlayer from "react-player";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  SkipForward,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  url?: string;
  iframe?: string;
  title: string;
  source: string;
  playing: boolean;
  volume: number;
  muted: boolean;
  onTogglePlay: () => void;
  onSkip10: () => void;
  isActive: boolean; // Is this player currently active/focused
}

export const VideoPlayer = memo(function VideoPlayer({
  url,
  iframe,
  title,
  source,
  playing,
  muted,
  volume,
  onTogglePlay,
  onSkip10,
  isActive
}: VideoPlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Handle iframe loading
  useEffect(() => {
    if (iframe) {
      setIsReady(true);
    }
  }, [iframe]);

  const handleSeekForward = () => {
    if (playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(currentTime + 10, 'seconds');
    }
    onSkip10();
  };

  return (
    <motion.div
      className={cn(
        "relative group w-full h-full bg-black rounded-xl overflow-hidden border-2 transition-all duration-300",
        isActive ? "border-primary shadow-[0_0_20px_rgba(236,72,153,0.3)]" : "border-border"
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Loading Overlay */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 z-10">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {/* Video Layer */}
      {iframe ? (
        <div className="w-full h-full relative">
          <iframe
            src={iframe.match(/src="([^"]+)"/)?.[1]}
            className="w-full h-full absolute inset-0"
            frameBorder="0"
            allowFullScreen
            title="Video Player"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <ReactPlayer
          ref={playerRef}
          src={url || ''}
          width="100%"
          height="100%"
          playing={playing}
          muted={muted}
          volume={volume}
          onReady={() => setIsReady(true)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onTimeUpdate={(e: React.SyntheticEvent<HTMLVideoElement>) => {
            const video = e.currentTarget
            if (video.duration > 0) {
              setProgress((video.currentTime / video.duration) * 100)
            }
          }}
          className="absolute top-0 left-0"
          style={{ objectFit: 'cover' }}
          controls={false}
          config={{
            youtube: {
              color: 'white',
              rel: 0,
              enablejsapi: 1
            }
          }}
        />
      )}

      {/* Hover Controls Overlay */}
      {!iframe && (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 flex flex-col justify-between p-4",
          showControls || !playing ? "opacity-100" : "opacity-0"
        )}>
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 inline-block mb-1">
                {source}
              </div>
              <h3 className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">{title}</h3>
            </div>
            <button className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors">
              <Maximize2 size={16} />
            </button>
          </div>

          {/* Center Play Button (only when paused) */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-primary/90 text-white p-4 rounded-full shadow-lg shadow-primary/20 backdrop-blur-sm pointer-events-auto cursor-pointer hover:scale-110 transition-transform"
                onClick={onTogglePlay}
              >
                <Play fill="currentColor" size={32} />
              </motion.div>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="space-y-2">
            {/* Progress Bar */}
            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all">
              <div
                className="h-full bg-primary shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={onTogglePlay}
                  className="text-white hover:text-primary transition-colors p-1"
                >
                  {playing ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
                </button>

                <button
                  onClick={handleSeekForward}
                  className="text-white hover:text-primary transition-colors p-1 flex items-center gap-0.5 group/skip"
                >
                  <SkipForward size={20} />
                  <span className="text-[10px] font-mono opacity-0 group-hover/skip:opacity-100 transition-opacity">+10s</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {muted ? (
                  <VolumeX size={18} className="text-white/70" />
                ) : (
                  <Volume2 size={18} className="text-white/70" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});
