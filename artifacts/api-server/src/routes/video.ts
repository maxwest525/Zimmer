import { Router } from "express";
import multer from "multer";
import { db, ideasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { uploadVideoBuffer } from "../lib/videoStorage";
import { transcribeVideo } from "../lib/transcription";
import { enrichIdeaFromTranscript } from "../lib/enrichment";

const ALLOWED_MIMETYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm",
];

const ALLOWED_EXTENSIONS = ["mp4", "mov", "m4v", "webm"];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (ALLOWED_MIMETYPES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported: mp4, mov, m4v, webm`));
    }
  },
});

const router = Router();

router.post("/ideas/:id/video", (req, res, next) => {
  upload.single("video")(req, res, (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? err.code === "LIMIT_FILE_SIZE" ? "File too large (max 100MB)" : err.message
        : err.message;
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid idea ID" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No video file provided" });
      return;
    }

    const [idea] = await db
      .select()
      .from(ideasTable)
      .where(eq(ideasTable.id, id));

    if (!idea) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }

    console.log(`[video] Uploading video for idea ${id}: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

    let videoPath: string;
    try {
      videoPath = await uploadVideoBuffer(file.buffer, file.originalname, file.mimetype);
    } catch (err) {
      console.error(`[video] Failed to upload video for idea ${id}:`, err);
      res.status(500).json({ error: "Failed to store video file" });
      return;
    }

    await db
      .update(ideasTable)
      .set({ videoPath, updatedAt: new Date() })
      .where(eq(ideasTable.id, id));

    console.log(`[video] Video stored at ${videoPath} for idea ${id}, starting transcription...`);

    res.json({
      videoPath,
      transcript: null,
      status: "transcribing",
    });

    void (async () => {
      try {
        const transcript = await transcribeVideo(file.buffer, file.originalname);
        console.log(`[video] Transcription complete for idea ${id}: ${transcript.slice(0, 100)}...`);

        await db
          .update(ideasTable)
          .set({ transcript, updatedAt: new Date() })
          .where(eq(ideasTable.id, id));

        if (transcript.trim().length > 10) {
          void enrichIdeaFromTranscript(id, idea.content, transcript).catch(err =>
            console.error("[video] Enrichment from transcript failed:", err)
          );
        }
      } catch (err) {
        console.error(`[video] Transcription failed for idea ${id}:`, err);
        await db
          .update(ideasTable)
          .set({
            enrichmentError: `Transcription failed: ${(err as Error).message}`,
            updatedAt: new Date(),
          })
          .where(eq(ideasTable.id, id));
      }
    })();
  } catch (err) {
    console.error("Failed to process video upload:", err);
    res.status(500).json({ error: "Failed to process video upload" });
  }
});

export default router;
