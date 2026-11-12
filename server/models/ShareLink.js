import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

/** Time-limited, revocable link that lets a doctor view one member's summary. */
const shareLinkSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    token: { type: String, unique: true, default: () => crypto.randomBytes(18).toString('base64url') },
    label: { type: String, trim: true, maxlength: 80, default: '' },
    records: [{ type: Schema.Types.ObjectId, ref: 'Record' }],
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    lastViewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

shareLinkSchema.virtual('active').get(function active() {
  return !this.revoked && this.expiresAt > new Date();
});

shareLinkSchema.set('toJSON', { virtuals: true, transform(_d, ret) { delete ret.__v; delete ret.id; return ret; } });

export default mongoose.model('ShareLink', shareLinkSchema);
