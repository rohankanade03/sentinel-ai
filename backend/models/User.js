import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["citizen", "admin", "officer", "worker"],
      default: "citizen",
      index: true,
    },
    preferredLanguage: { type: String, default: "en" },
    ward: { type: String, index: true },
    department: { type: String, index: true },
    officerCode: { type: String, index: true, sparse: true },
    workerId: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    lastLoginAt: Date,
    refreshTokenHash: { type: String, select: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpiresAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
