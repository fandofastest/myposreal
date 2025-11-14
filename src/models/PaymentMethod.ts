import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentMethod extends Document {
  name: string;
  code: string;
  type: 'cash' | 'transfer' | 'ewallet';
  provider?: string; // bank name or e-wallet provider
  accountNumber?: string;
  accountName?: string;
  store?: mongoose.Types.ObjectId | null;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    type: { type: String, enum: ['cash', 'transfer', 'ewallet'], required: true },
    provider: { type: String },
    accountNumber: { type: String },
    accountName: { type: String },
    store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  { timestamps: true }
);

PaymentMethodSchema.index({ store: 1, code: 1 }, { unique: true, sparse: true });
PaymentMethodSchema.index({ name: 'text', code: 'text', provider: 'text' });

export const PaymentMethod: Model<IPaymentMethod> = mongoose.models.PaymentMethod || mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);
