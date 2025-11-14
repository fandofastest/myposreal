import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchaseItem {
  product: mongoose.Types.ObjectId;
  name: string;
  sku?: string;
  cost: number;
  qty: number;
  subtotal: number;
}

export interface IPurchase extends Document {
  store: mongoose.Types.ObjectId;
  supplier: mongoose.Types.ObjectId;
  items: IPurchaseItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  status: 'draft' | 'received';
  receivedAt?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  sku: { type: String },
  cost: { type: Number, required: true },
  qty: { type: Number, required: true },
  subtotal: { type: Number, required: true },
}, { _id: false });

const PurchaseSchema = new Schema<IPurchase>({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: { type: [PurchaseItemSchema], required: true },
  subtotal: { type: Number, required: true },
  discount: { type: Number },
  tax: { type: Number },
  total: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'received'], default: 'draft' },
  receivedAt: { type: Date },
  note: { type: String },
}, { timestamps: true });

PurchaseSchema.index({ store: 1, createdAt: -1 });

export const Purchase: Model<IPurchase> = mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);
