import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStoreSetting extends Document {
  store: mongoose.Types.ObjectId;
  defaultProductImage?: string;
  defaultCategoryImage?: string;
  logoUrl?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  taxRate?: number;
  taxInclusive?: boolean;
  defaultMarginPct?: number;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSettingSchema = new Schema<IStoreSetting>(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    defaultProductImage: { type: String },
    defaultCategoryImage: { type: String },
    logoUrl: { type: String },
    receiptHeader: { type: String },
    receiptFooter: { type: String },
    taxRate: { type: Number },
    taxInclusive: { type: Boolean },
    defaultMarginPct: { type: Number },
  },
  { timestamps: true }
);

StoreSettingSchema.index({ store: 1 }, { unique: true });

export const StoreSetting: Model<IStoreSetting> = mongoose.models.StoreSetting || mongoose.model<IStoreSetting>('StoreSetting', StoreSettingSchema);
