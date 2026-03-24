import { Link, useLocation } from "wouter";
import { Leaf, Upload, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/50 backdrop-blur-xl backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center gap-3 group transition-transform duration-300 hover:scale-[1.02]"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10 overflow-hidden">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo.png`} 
              alt="Logo" 
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50"
            />
            <Leaf className="w-5 h-5 text-primary relative z-10 group-hover:animate-pulse" />
          </div>
          <span className="font-display font-bold text-xl tracking-wide text-foreground">
            Hidden<span className="text-primary">Chimney</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link 
            href="/" 
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
              location === "/" 
                ? "bg-white/10 text-white shadow-inner" 
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            <MonitorPlay className="w-4 h-4" />
            <span className="hidden sm:inline">Browse</span>
          </Link>
          
          <Link 
            href="/upload" 
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300",
              location === "/upload"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-white/5 text-white hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
            )}
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
