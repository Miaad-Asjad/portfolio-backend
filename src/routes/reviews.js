
import { Router } from "express";
import { createHash } from "node:crypto";
import Review from "../models/Review.js";
import ReviewInvitation from "../models/ReviewInvitation.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const reviews = await Review.find({
      status: "approved",
      permissionToPublish: true,
    })
      .select("clientName projectName message createdAt")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({ reviews });
  } catch {
    res.status(500).json({ message: "Unable to load reviews right now." });
  }
});

router.post("/submit", async (req, res) => {
  try {
    const { token, clientName, message, permissionToPublish } = req.body;

    if (
      typeof token !== "string" ||
      typeof clientName !== "string" ||
      typeof message !== "string" ||
      permissionToPublish !== true
    ) {
      return res.status(400).json({
        message: "Please complete all fields and give permission to publish.",
      });
    }

    const cleanName = clientName.trim();
    const cleanMessage = message.trim();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({ message: "Name must be 2–80 characters." });
    }

    if (cleanMessage.length < 10 || cleanMessage.length > 1200) {
      return res.status(400).json({ message: "Review must be 10–1200 characters." });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Atomically claim a valid, unused invitation.
    const invitation = await ReviewInvitation.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { new: true }
    );

    if (!invitation) {
      return res.status(400).json({
        message: "This review link is invalid, expired, or already used.",
      });
    }

    await Review.create({
      clientName: cleanName,
      projectName: invitation.projectName,
      message: cleanMessage,
      permissionToPublish: true,
      status: "pending",
    });

    res.status(201).json({
      message: "Thank you! Your review has been sent for approval.",
    });
  } catch {
    res.status(500).json({ message: "Unable to submit your review right now." });
  }
});

export default router;
