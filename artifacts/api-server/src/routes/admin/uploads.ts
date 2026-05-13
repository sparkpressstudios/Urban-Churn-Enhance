import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { mediaTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Store in memory — we persist to the database, not disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
        }
    },
});

const router: IRouter = Router();

// Upload: save image binary to the database
router.post("/", upload.single("image"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;

    await db.insert(mediaTable).values({
        filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        data: req.file.buffer,
    });

    const url = `/api/uploads/${filename}`;
    res.json({ url, filename });
});

export default router;
