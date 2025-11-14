import { z } from 'zod';

export const categoryCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  parent: z.string().optional(),
  imageUrl: z.string().url().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
