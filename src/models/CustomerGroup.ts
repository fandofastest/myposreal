import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomerGroup extends Document {
  name: string;
  code: string;
  store?: mongoose.Types.ObjectId | null;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const CustomerGroupSchema = new Schema<ICustomerGroup>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  { timestamps: true }
);

CustomerGroupSchema.index({ store: 1, code: 1 }, { unique: true, sparse: true });
CustomerGroupSchema.index({ name: 'text', code: 'text' });

export const CustomerGroup: Model<ICustomerGroup> = mongoose.models.CustomerGroup || mongoose.model<ICustomerGroup>('CustomerGroup', CustomerGroupSchema);
