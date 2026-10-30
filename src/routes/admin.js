
import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Review from "../models/Review.js";
import ReviewInvitation from "../models/ReviewInvitation.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;

    if (
      !process.env.ADMIN_PASSWORD_HASH ||
      !process.env.JWT_SECRET ||
      typeof password !== "string"
    ) {
      return res.status(503).json({ message: "Admin login is not configured." });
    }

    const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

    if (!valid) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    const token = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token, expiresIn: 7200 });
  } catch {
    res.status(500).json({ message: "Unable to log in." });
  }
});

router.use(requireAdmin);

router.get("/reviews", async (_req, res) => {
  try {
    const reviews = await Review.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ reviews });
  } catch {
    res.status(500).json({ message: "Unable to load pending reviews." });
  }
});

router.post("/invitations", async (req, res) => {
  try {
    const projectName =
      typeof req.body.projectName === "string"
        ? req.body.projectName.trim()
        : "";

    if (!projectName || projectName.length > 100) {
      return res.status(400).json({ message: "Enter a valid project name." });
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await ReviewInvitation.create({
      tokenHash,
      projectName,
      expiresAt,
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const reviewUrl = `${clientUrl.replace(/\/$/, "")}/leave-review?token=${token}`;

    res.status(201).json({
      reviewUrl,
      expiresAt,
      message: "Invitation created. Send this link privately to the client.",
    });
  } catch {
    res.status(500).json({ message: "Unable to create invitation." });
  }
});

router.patch("/reviews/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid review status." });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    res.json({
      message: status === "approved" ? "Review approved." : "Review rejected.",
      review,
    });
  } catch {
    res.status(500).json({ message: "Unable to update review." });
  }
});

router.delete("/invitations/:id", async (req, res) => {
  try {
    const invitation = await ReviewInvitation.findByIdAndUpdate(
      req.params.id,
      { $set: { revokedAt: new Date() } },
      { new: true }
    );

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found." });
    }

    res.json({ message: "Invitation revoked." });
  } catch {
    res.status(500).json({ message: "Unable to revoke invitation." });
  }
});

export default router;
