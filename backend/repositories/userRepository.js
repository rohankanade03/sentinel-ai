import User from "../models/User.js";

export const userRepository = {
  create(payload) {
    return User.create(payload);
  },

  findByEmail(email) {
    return User.findOne({ email });
  },

  findByEmailWithSecrets(email) {
    return User.findOne({ email }).select("+password +refreshTokenHash");
  },

  findById(id) {
    return User.findById(id);
  },

  findByIdWithRefreshToken(id) {
    return User.findById(id).select("+refreshTokenHash");
  },

  findActiveResetCandidates() {
    return User.find({ resetPasswordExpiresAt: { $gt: new Date() } }).select(
      "+resetPasswordTokenHash",
    );
  },
};
