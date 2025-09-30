import { Router } from "express";
import multer from "multer";
import { uploadFile, uploadFiles } from "../controllers/upload.controller";

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/file", upload.single("file"), uploadFile);

router.post("/files", upload.array("file", 5), uploadFiles);

export default router;