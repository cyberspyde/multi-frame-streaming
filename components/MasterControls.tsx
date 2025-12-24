import { useCallback, useRef, memo } from "react";
import { 
  Play, 
  Pause, 
  FastForward, 
  RotateCcw,
  Volume2,
  VolumeX,
  LayoutGrid
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface MasterControlsProps {
  isPlayingAll: boolean;
  onPlayAll: () => void;
  onPauseAll: () => void;
  onNextBatch: () => void;
  onReset: () => void;
  onMuteAll: (muted: boolean) => void;
  isMuted: boolean;
  onSkipAll: () => void;
  currentPage: number;
}

export const MasterControls = memo(function MasterControls({
  isPlayingAll,
  onPlayAll,
  onPauseAll,
  onNextBatch,
  onReset,
  onMuteAll,
  isMuted,
  onSkipAll,
  currentPage
}: MasterControlsProps) {
  // Debounce to prevent accidental rapid clicks
  const debounceRef = useRef<NodeJS.Timeout>();
  const safeOnClick = useCallback((fn: () => void) => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fn(), 50);
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent z-50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Status Display */}
          <div className="flex items-center gap-4 min-w-[200px]">
            <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20">
              <LayoutGrid className="text-primary w-6 h-6" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm tracking-wide font-display">MULTI-VIEW</h2>
              <p className="text-zinc-400 text-xs font-mono">BATCH #{currentPage} • ACTIVE</p>
            </div>
          </div>

          {/* Center Playback Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={safeOnClick(onReset)}
              className="h-12 w-12 rounded-full border-white/10 hover:bg-white/5 hover:text-white bg-transparent"
              title="Reset Simulation"
            >
              <RotateCcw size={20} />
            </Button>

            <div className="h-8 w-px bg-white/10 mx-2" />

            <Button
              size="lg"
              onClick={safeOnClick(isPlayingAll ? onPauseAll : onPlayAll)}
              className={`
                h-14 px-8 rounded-full text-lg font-bold tracking-wide shadow-lg shadow-primary/25 transition-all
                ${isPlayingAll 
                  ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10" 
                  : "bg-primary hover:bg-primary/90 text-white hover:scale-105"
                }
              `}
            >
              {isPlayingAll ? (
                <span className="flex items-center gap-2">
                  <Pause fill="currentColor" /> PAUSE ALL
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play fill="currentColor" /> PLAY ALL
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={safeOnClick(onSkipAll)}
              className="h-12 w-12 rounded-full border-white/10 hover:bg-white/5 hover:text-white bg-transparent"
              title="Skip +10s (All)"
            >
              <FastForward size={20} />
            </Button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-6 min-w-[200px] justify-end">
            <div className="flex items-center gap-3 bg-black/40 rounded-full px-4 py-2 border border-white/5">
              <button 
                onClick={() => onMuteAll(!isMuted)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <Slider 
                defaultValue={[75]} 
                max={100} 
                step={1} 
                className="w-24"
              />
            </div>

            <Button
              onClick={safeOnClick(onNextBatch)}
              className="bg-white text-black hover:bg-zinc-200 font-bold rounded-xl px-6"
            >
              NEXT BATCH
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
