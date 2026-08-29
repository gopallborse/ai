import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { ingestPDF } from "../services/ingestService.js";

const router = express.Router();

// Ensure pdf folder exists
const pdfDir = "./pdfs";

if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir);
}

// Storage configuration
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, pdfDir);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname);

    cb(null, `uploaded${ext}`);
  },
});

const upload = multer({
  storage,
});

router.post("/", upload.single("pdf"), async (req, res) => {
  try {
    console.log("File Uploaded:", req.file.filename);

    await ingestPDF(req.file.path);

    res.json({
      success: true,
      ready: true,
      message: "PDF uploaded and indexed successfully.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;
