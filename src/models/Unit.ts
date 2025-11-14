import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUnit extends Document {
  name: string;
  code: string; // e.g., pcs, box, doz
  factor: number; // conversion factor relative to base unit (base = 1)
  base: boolean; // true if this is the base unit in the store
  store?: mongoose.Types.ObjectId | null;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    factor: { type: Number, required: true, min: 0 },
    base: { type: Boolean, default: false },
    store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  { timestamps: true }
);

// Unique code per store
UnitSchema.index({ store: 1, code: 1 }, { unique: true, sparse: true });

export const Unit: Model<IUnit> = mongoose.models.Unit || mongoose.model<IUnit>('Unit', UnitSchema);
