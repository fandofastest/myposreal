import { z } from 'zod';

export const productCreateSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  price: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  trackStock: z.boolean().optional(),
  minStock: z.number().nonnegative().optional(),
  status: z.enum(['active', 'archived']).optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  stock: z.number().nonnegative().optional(),
  baseUnit: z.string().optional(),
  marginPct: z.number().optional(),
  unitPrices: z.array(z.object({ code: z.string().min(1), price: z.number().nonnegative(), factor: z.number().positive().int().optional() })).optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
