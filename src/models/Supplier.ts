import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  code: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  store?: mongoose.Types.ObjectId | null;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    contact: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    taxId: { type: String },
    store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  { timestamps: true }
);

SupplierSchema.index({ store: 1, code: 1 }, { unique: true, sparse: true });
SupplierSchema.index({ name: 'text', code: 'text', contact: 'text' });

export const Supplier: Model<ISupplier> = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
