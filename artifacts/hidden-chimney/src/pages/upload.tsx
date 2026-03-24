import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useUploadVideo } from "@workspace/api-client-react";
import { UploadCloud, FileVideo, X, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  
  const uploadMutation = useUploadVideo({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Upload complete!",
          description: "Your video is ready for eco-streaming.",
        });
        setLocation("/");
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: err.error || "An unexpected error occurred.",
        });
      }
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      // Auto-fill title from filename
      if (!title) {
        setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.ogg', '.mov']
    },
    maxFiles: 1,
    disabled: uploadMutation.isPending
  });

  const handleUpload = () => {
    if (!file) return;
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for your video." });
      return;
    }

    uploadMutation.mutate({
      data: {
        video: file,
        title: title.trim()
      }
    });
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 py-12 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-8 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Upload Video</h1>
          <p className="text-muted-foreground">
            Share your content. We'll automatically generate an eco-friendly 480p version for sustainable streaming.
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Dropzone */}
          <div 
            {...getRootProps()} 
            className={`
              relative group cursor-pointer w-full rounded-2xl border-2 border-dashed transition-all duration-300 ease-out
              flex flex-col items-center justify-center p-12 text-center min-h-[280px]
              ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-white/10 hover:border-white/30 hover:bg-white/[0.02]'}
              ${isDragReject ? 'border-destructive bg-destructive/5' : ''}
              ${file ? 'border-solid border-primary/30 bg-primary/[0.02]' : ''}
              ${uploadMutation.isPending ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className={`w-10 h-10 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    {isDragActive ? "Drop video here" : "Drag & drop video"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    or click to browse from your computer
                  </p>
                  <div className="mt-6 flex items-center gap-4 text-xs font-medium text-muted-foreground/60">
                    <span>MP4</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>WEBM</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>MOV</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="file"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mb-6">
                    <FileVideo className="w-10 h-10 text-primary" />
                  </div>
                  <div className="max-w-[80%] text-center">
                    <h3 className="text-lg font-medium text-white truncate mb-1" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  
                  {!uploadMutation.isPending && (
                    <button 
                      onClick={removeFile}
                      className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-muted-foreground hover:text-white hover:bg-destructive/80 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form Fields */}
          <AnimatePresence>
            {file && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label htmlFor="title" className="block text-sm font-medium text-white">
                    Video Title
                  </label>
                  <input 
                    id="title"
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploadMutation.isPending}
                    placeholder="Enter a captivating title..."
                    className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending || !title.trim()}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                    bg-gradient-to-r from-primary to-emerald-400 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Uploading & Processing...
                    </>
                  ) : uploadMutation.isSuccess ? (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      Success!
                    </>
                  ) : uploadMutation.isError ? (
                    <>
                      <AlertCircle className="w-6 h-6" />
                      Retry Upload
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6" />
                      Upload to Hidden Chimney
                    </>
                  )}
                </button>
                
                {uploadMutation.isPending && (
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-4">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: "90%" }}
                      transition={{ duration: 10, ease: "easeOut" }}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
