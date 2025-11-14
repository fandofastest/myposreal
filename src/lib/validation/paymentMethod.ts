import { z } from 'zod';

const emptyToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const paymentMethodCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.enum(['cash', 'transfer', 'ewallet']),
  provider: z.preprocess(emptyToUndef, z.string().optional()),
  accountNumber: z.preprocess(emptyToUndef, z.string().optional()),
  accountName: z.preprocess(emptyToUndef, z.string().optional()),
  status: z.enum(['active', 'disabled']).optional(),
});

export const paymentMethodUpdateSchema = paymentMethodCreateSchema.partial();

export type PaymentMethodCreateInput = z.infer<typeof paymentMethodCreateSchema>;
export type PaymentMethodUpdateInput = z.infer<typeof paymentMethodUpdateSchema>;
