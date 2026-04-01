import express from "express";
import { getCommunicationLogs } from "../controllers/communicationLogController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin", "moderator"));

router.get("/", getCommunicationLogs);

export default router;
