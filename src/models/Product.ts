import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost?: number; // last cost per base unit
  taxRate?: number; // 0.11 for 11%
  trackStock: boolean;
  minStock?: number;
  status: 'active' | 'archived';
  store?: mongoose.Types.ObjectId | null;
  category?: mongoose.Types.ObjectId | null;
  imageUrl?: string;
  stock?: number;
  baseUnit?: string;
  purchaseUnits?: Array<{ name: string; conversionToBase: number }>;
  marginPct?: number; // override default margin
  unitPrices?: Array<{ code: string; name?: string; factor?: number; price: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, index: true },
    sku: { type: String, required: true, index: true },
    barcode: { type: String },
    price: { type: Number, required: false, default: 0, min: 0 },
    cost: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0.11 },
    trackStock: { type: Boolean, default: true },
    minStock: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    imageUrl: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    baseUnit: { type: String, default: 'pcs' },
    purchaseUnits: { type: [{ name: String, conversionToBase: Number }], default: [] },
    marginPct: { type: Number },
    unitPrices: { type: [{ code: String, name: String, factor: Number, price: Number }], default: [] },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text', sku: 'text', barcode: 'text' });
ProductSchema.index({ store: 1, sku: 1 }, { unique: true, sparse: true });

export const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
