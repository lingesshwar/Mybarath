import { useListVideos } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Leaf, Clock, PlayCircle, Film } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const { data, isLoading, isError } = useListVideos();

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Section */}
      <section className="relative w-full h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden border-b border-white/5">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Hero Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        <div className="relative z-10 text-center max-w-3xl px-4 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Leaf className="w-4 h-4" />
              Carbon-Aware Streaming
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight">
              Sustainable Entertainment. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300">
                Zero Compromise.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              Experience high-quality video playback while drastically reducing global carbon emissions through real-time client-side rendering.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Videos Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-semibold text-white flex items-center gap-3">
            <PlayCircle className="w-6 h-6 text-primary" />
            Recent Uploads
          </h2>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse flex flex-col gap-4">
                <div className="aspect-video bg-white/5 rounded-2xl" />
                <div className="h-6 bg-white/5 rounded w-3/4" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="w-full py-24 flex flex-col items-center justify-center text-center bg-white/5 rounded-3xl border border-white/5">
            <p className="text-destructive font-medium text-lg">Failed to load videos.</p>
            <p className="text-muted-foreground mt-2">The API might be unavailable.</p>
          </div>
        )}

        {data?.videos && data.videos.length === 0 && (
          <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-gradient-to-b from-white/5 to-transparent rounded-3xl border border-white/5">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Film className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-white mb-2">No videos yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md">Be the first to upload a video and experience carbon-aware streaming.</p>
            <Link 
              href="/upload" 
              className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-1 transition-all duration-300"
            >
              Upload Video
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {data?.videos?.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link 
                href={`/player/${video.id}`}
                className="group block relative"
              >
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-secondary border border-white/5 mb-4 shadow-lg transition-all duration-500 group-hover:shadow-primary/20 group-hover:border-primary/30">
                  {/* Thumbnail */}
                  {video.thumbnailUrl ? (
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-card to-background flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                      <PlayCircle className="w-12 h-12 text-white/20 group-hover:text-primary/50 transition-colors" />
                    </div>
                  )}
                  
                  {/* Overlay Play Button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/30 transform scale-75 group-hover:scale-100 transition-all duration-300 ease-out">
                      <PlayCircle className="w-8 h-8 ml-1" fill="currentColor" />
                    </div>
                  </div>

                  {/* Eco Badge */}
                  {video.ecoReady && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-primary/30 text-xs font-semibold text-primary flex items-center gap-1.5 shadow-lg">
                      <Leaf className="w-3 h-3" />
                      Eco Ready
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-medium text-white group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                  {video.title}
                </h3>
                
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(video.createdAt), "MMM d, yyyy")}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
