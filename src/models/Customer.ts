import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  group?: mongoose.Types.ObjectId | null;
  store?: mongoose.Types.ObjectId | null;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    group: { type: Schema.Types.ObjectId, ref: 'CustomerGroup', default: null },
    store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  { timestamps: true }
);

CustomerSchema.index({ store: 1, code: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ name: 'text', code: 'text' });

export const Customer: Model<ICustomer> = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
