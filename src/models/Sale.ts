import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  name: string;
  sku?: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface ISale extends Document {
  store: mongoose.Types.ObjectId;
  items: ISaleItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentMethod: mongoose.Types.ObjectId; // ref PaymentMethod
  paymentType: 'cash' | 'transfer' | 'ewallet';
  customer?: mongoose.Types.ObjectId | null;
  cashier: mongoose.Types.ObjectId; // user
  amountPaid?: number;
  change?: number;
  status: 'completed' | 'voided';
  voidedAt?: Date;
  voidReason?: string;
  voidBy?: mongoose.Types.ObjectId | null;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  sku: { type: String },
  price: { type: Number, required: true },
  qty: { type: Number, required: true },
  subtotal: { type: Number, required: true },
}, { _id: false });

const SaleSchema = new Schema<ISale>({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  items: { type: [SaleItemSchema], required: true },
  subtotal: { type: Number, required: true },
  discount: { type: Number },
  tax: { type: Number },
  total: { type: Number, required: true },
  paymentMethod: { type: Schema.Types.ObjectId, ref: 'PaymentMethod', required: true },
  paymentType: { type: String, enum: ['cash', 'transfer', 'ewallet'], required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
  cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amountPaid: { type: Number },
  change: { type: Number },
  status: { type: String, enum: ['completed', 'voided'], default: 'completed' },
  voidedAt: { type: Date },
  voidReason: { type: String },
  voidBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  paidAt: { type: Date, required: true },
}, { timestamps: true });

SaleSchema.index({ store: 1, createdAt: -1 });

export const Sale: Model<ISale> = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);
