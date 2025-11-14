import { z } from 'zod';

export const customerCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  group: z.string().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
