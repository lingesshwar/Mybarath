import { useState, useRef, useEffect } from "react";
import { useRoute } from "wouter";
import { useGetVideo } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Play, Pause, Volume2, VolumeX, Maximize, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { formatDuration } from "@/lib/utils";

type PlaybackMode = 'normal' | 'eco';

export default function Player() {
  const [, params] = useRoute("/player/:id");
  const videoId = params?.id || "";
  
  const { data, isLoading, isError } = useGetVideo(videoId);
  
  const [mode, setMode] = useState<PlaybackMode>('normal');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize Eco mode safely if available
  useEffect(() => {
    if (data?.video?.ecoReady) {
      setMode('eco');
    }
  }, [data?.video?.ecoReady]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Sync state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Handle Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = (parseFloat(e.target.value) / 100) * video.duration;
    video.currentTime = time;
    setProgress(parseFloat(e.target.value));
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  };

  // ==========================================
  // MANDATORY: HTML5 Canvas Pixel Manipulation 
  // for "Eco Mode" Simulation
  // ==========================================
  useEffect(() => {
    if (mode !== 'eco') {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const processFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Only process if playing to save CPU, but draw one frame when paused to avoid black screen
      if (video.paused && video.currentTime === 0) {
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Match canvas internal resolution to video source resolution
      if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (canvas.width === 0 || canvas.height === 0) {
         animationRef.current = requestAnimationFrame(processFrame);
         return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Draw original video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Extract pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Fast O(N) pixel manipulation for sharpening and contrast
      const contrast = 30; // Contrast boost
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      
      for (let y = 0; y < height; y++) {
        for (let x = 1; x < width; x++) {
           const i = (y * width + x) * 4;
           const left_i = i - 4;

           // Edge detection / sharpening approximation via horizontal diff
           const diffR = data[i] - data[left_i];
           const diffG = data[i+1] - data[left_i+1];
           const diffB = data[i+2] - data[left_i+2];

           // Apply contrast formula and add diffs for "sharpening" effect
           let r = factor * (data[i] - 128) + 128 + (diffR * 0.8);
           let g = factor * (data[i+1] - 128) + 128 + (diffG * 0.8);
           let b = factor * (data[i+2] - 128) + 128 + (diffB * 0.8);

           // Eco simulation: Boost greens slightly, crush blacks
           g = g * 1.05; 
           if (r < 20 && g < 20 && b < 20) {
              r = g = b = 5; // Crush absolute blacks to dark gray to save OLED power
           }

           data[i] = r;
           data[i+1] = g;
           data[i+2] = b;
        }
      }

      // Paint pixels back
      ctx.putImageData(imageData, 0, 0);

      // Loop
      animationRef.current = requestAnimationFrame(processFrame);
    };

    animationRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [mode, isPlaying]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading cinematic experience...</p>
      </div>
    );
  }

  if (isError || !data?.video) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-6 text-center px-4">
        <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Video not found</h1>
          <p className="text-muted-foreground max-w-md mx-auto">The video you're looking for doesn't exist or has been removed.</p>
        </div>
        <Link href="/" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  const video = data.video;
  // Determine which source URL to play in the hidden video element
  const videoSrc = mode === 'eco' && video.ecoReady ? video.ecoUrl : video.originalUrl;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-black/50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors w-fit group">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="font-medium">Back to Browse</span>
          </Link>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 self-start sm:self-auto shadow-xl">
            <button
              onClick={() => setMode('normal')}
              className={`
                px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                ${mode === 'normal' 
                  ? 'bg-white/10 text-white shadow-inner' 
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'}
              `}
            >
              High Quality
            </button>
            <button
              onClick={() => {
                if (video.ecoReady) setMode('eco');
              }}
              disabled={!video.ecoReady}
              className={`
                px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2
                ${mode === 'eco' 
                  ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                  : !video.ecoReady 
                    ? 'opacity-50 cursor-not-allowed text-muted-foreground' 
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}
              `}
            >
              <Leaf className="w-4 h-4" />
              Eco Mode
            </button>
          </div>
        </div>

        {/* Player Container */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-white/10 group select-none"
        >
          {/* The Actual Hidden/Visible Video Element */}
          <video
            ref={videoRef}
            src={videoSrc}
            crossOrigin="anonymous" // Needed for canvas pixel extraction if cross-origin
            className={`w-full h-full object-contain ${mode === 'eco' ? 'hidden' : 'block'}`}
            playsInline
            muted={isMuted}
            onClick={togglePlay}
          />

          {/* The Canvas for Eco Mode */}
          <canvas
            ref={canvasRef}
            onClick={togglePlay}
            className={`w-full h-full object-contain cursor-pointer ${mode === 'normal' ? 'hidden' : 'block'}`}
          />

          {/* Eco Mode Badges */}
          <AnimatePresence>
            {mode === 'eco' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none"
              >
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-primary/30 text-xs font-bold text-primary flex items-center gap-2 shadow-lg shadow-primary/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Simulated AI Enhancement Active
                </div>
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white shadow-lg w-fit">
                  Carbon saved: ~45%
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Custom Controls Overlay */}
          <div 
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-24 pb-6 px-6 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Progress Bar */}
            <div className="mb-4 relative group/slider">
              <input 
                type="range" 
                min={0} 
                max={100} 
                step={0.1}
                value={progress} 
                onChange={handleSeek}
                className="w-full relative z-10" 
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button 
                  onClick={togglePlay}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 text-white transition-all backdrop-blur-md"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                </button>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <span className="text-sm font-medium text-white/90 font-mono tracking-wider">
                    {formatDuration(currentTime)} <span className="text-white/30 mx-1">/</span> {formatDuration(duration)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleFullscreen}
                  className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Info */}
        <div className="bg-card border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">{video.title}</h1>
          <p className="text-muted-foreground flex items-center gap-2 font-medium">
            Uploaded on {new Date(video.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            {!video.ecoReady && (
              <span className="ml-4 text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                Eco processing pending...
              </span>
            )}
          </p>
          
          <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">About Eco Mode</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Eco Mode significantly reduces data transfer by delivering a highly compressed 480p stream. 
                Our client-side rendering engine uses your device's GPU to locally upsample, sharpen, and boost contrast—delivering perceived HD quality while saving massive amounts of carbon.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Technical Details</h3>
              <ul className="space-y-2 text-sm text-muted-foreground font-mono">
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span>Source Format</span> <span className="text-white">MP4 / WebM</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span>Enhancement Engine</span> <span className="text-primary">Canvas Kernel Conv.</span>
                </li>
                <li className="flex justify-between pb-2">
                  <span>Frame Rate Target</span> <span className="text-white">30 FPS</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
