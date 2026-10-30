
import mongoose from "mongoose";

const reviewInvitationSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    projectName: { type: String, required: true, trim: true, maxlength: 100 },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("ReviewInvitation", reviewInvitationSchema);
