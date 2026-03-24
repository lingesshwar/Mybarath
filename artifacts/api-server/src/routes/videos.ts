import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import { db } from "@workspace/db";
import { videosTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = randomUUID();
    cb(null, `${id}_original${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

function getVideoUrl(filename: string): string {
  return `/api/uploads/${filename}`;
}

function generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .screenshots({
        count: 1,
        timemarks: ["1"],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: "640x360",
      })
      .on("end", () => resolve())
      .on("error", () => {
        resolve();
      });
  });
}

function generateEcoVersion(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters([
        "scale=854:480:force_original_aspect_ratio=decrease",
        "pad=854:480:(ow-iw)/2:(oh-ih)/2",
      ])
      .outputOptions(["-c:v libx264", "-crf 28", "-preset fast", "-c:a aac", "-b:a 128k"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

router.get("/videos", async (req: Request, res: Response) => {
  try {
    const videos = await db.select().from(videosTable).orderBy(videosTable.createdAt);
    const result = videos.map((v) => ({
      id: v.id,
      title: v.title,
      originalUrl: getVideoUrl(v.originalFilename),
      ecoUrl: v.ecoFilename ? getVideoUrl(v.ecoFilename) : getVideoUrl(v.originalFilename),
      thumbnailUrl: v.thumbnailFilename
        ? getVideoUrl(v.thumbnailFilename)
        : "/api/placeholder-thumbnail",
      ecoReady: v.ecoReady,
      createdAt: v.createdAt.toISOString(),
    }));
    res.json({ videos: result });
  } catch (err) {
    req.log.error({ err }, "Failed to list videos");
    res.status(500).json({ error: "Failed to list videos" });
  }
});

router.post("/videos/upload", upload.single("video"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file uploaded" });
    return;
  }

  const id = randomUUID();
  const title = (req.body.title as string) || path.parse(req.file.originalname).name;
  const originalFilename = req.file.filename;

  try {
    const thumbnailFilename = `${id}_thumbnail.jpg`;
    const thumbnailPath = path.join(UPLOADS_DIR, thumbnailFilename);

    await generateThumbnail(req.file.path, thumbnailPath);

    await db.insert(videosTable).values({
      id,
      title,
      originalFilename,
      ecoFilename: null,
      thumbnailFilename: fs.existsSync(thumbnailPath) ? thumbnailFilename : null,
      ecoReady: false,
    });

    const video = {
      id,
      title,
      originalUrl: getVideoUrl(originalFilename),
      ecoUrl: getVideoUrl(originalFilename),
      thumbnailUrl: fs.existsSync(thumbnailPath)
        ? getVideoUrl(thumbnailFilename)
        : "/api/placeholder-thumbnail",
      ecoReady: false,
      createdAt: new Date().toISOString(),
    };

    res.json({ video, message: "Video uploaded successfully. Eco version is being processed." });

    const ecoFilename = `${id}_480p.mp4`;
    const ecoPath = path.join(UPLOADS_DIR, ecoFilename);

    generateEcoVersion(req.file.path, ecoPath)
      .then(async () => {
        await db
          .update(videosTable)
          .set({ ecoFilename, ecoReady: true })
          .where(eq(videosTable.id, id));
        req.log.info({ id }, "Eco version generated successfully");
      })
      .catch((err) => {
        req.log.error({ err, id }, "Failed to generate eco version");
      });
  } catch (err) {
    req.log.error({ err }, "Upload processing failed");
    res.status(500).json({ error: "Upload processing failed" });
  }
});

router.get("/videos/:id", async (req: Request, res: Response) => {
  try {
    const [video] = await db
      .select()
      .from(videosTable)
      .where(eq(videosTable.id, req.params.id))
      .limit(1);

    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    res.json({
      video: {
        id: video.id,
        title: video.title,
        originalUrl: getVideoUrl(video.originalFilename),
        ecoUrl: video.ecoFilename ? getVideoUrl(video.ecoFilename) : getVideoUrl(video.originalFilename),
        thumbnailUrl: video.thumbnailFilename
          ? getVideoUrl(video.thumbnailFilename)
          : "/api/placeholder-thumbnail",
        ecoReady: video.ecoReady,
        createdAt: video.createdAt.toISOString(),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get video");
    res.status(500).json({ error: "Failed to get video" });
  }
});

router.get("/uploads/:filename", (req: Request, res: Response) => {
  const filename = req.params.filename;
  const safeName = path.basename(filename);
  const filePath = path.join(UPLOADS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.sendFile(filePath);
});

router.get("/placeholder-thumbnail", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#1a1a2e"/>
    <polygon points="240,120 400,180 240,240" fill="#4ade80" opacity="0.8"/>
    <text x="320" y="310" text-anchor="middle" fill="#6b7280" font-size="16" font-family="sans-serif">No thumbnail</text>
  </svg>`);
});

export default router;
