import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  code: string;
  parent?: mongoose.Types.ObjectId | null;
  store?: mongoose.Types.ObjectId | null;
  imageUrl?: string;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    imageUrl: { type: String },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  { timestamps: true }
);

CategorySchema.index({ store: 1, code: 1 }, { unique: true, sparse: true });

export const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
