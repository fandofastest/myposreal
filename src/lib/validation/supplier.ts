import { z } from 'zod';

const emptyToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const supplierCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  contact: z.preprocess(emptyToUndef, z.string().optional()),
  phone: z.preprocess(emptyToUndef, z.string().optional()),
  email: z.preprocess(emptyToUndef, z.string().email().optional()),
  address: z.preprocess(emptyToUndef, z.string().optional()),
  taxId: z.preprocess(emptyToUndef, z.string().optional()),
  status: z.enum(['active', 'disabled']).optional(),
});

export const supplierUpdateSchema = supplierCreateSchema.partial();

export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
