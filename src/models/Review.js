import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  clientName: { type: String, required: true, trim: true, maxlength: 80 },
  projectName: { type: String, required: true, trim: true, maxlength: 100 },
  message: { type: String, required: true, trim: true, maxlength: 1200 },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  permissionToPublish: { type: Boolean, required: true, default: false }
}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);
