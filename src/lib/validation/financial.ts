import { z } from 'zod';

export const accountPayableSchema = z.object({
  description: z.string()
    .trim()
    .min(1, 'Descrição é obrigatória')
    .max(500, 'Descrição muito longa (máximo 500 caracteres)'),
  amount: z.number()
    .positive('Valor deve ser positivo')
    .max(99999999, 'Valor muito alto'),
  due_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  supplier: z.string().max(255).optional().nullable(),
  payment_method: z.string().max(100).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  document_number: z.string().max(100).optional().nullable(),
});

export const accountReceivableSchema = z.object({
  description: z.string()
    .trim()
    .min(1, 'Descrição é obrigatória')
    .max(500, 'Descrição muito longa (máximo 500 caracteres)'),
  amount: z.number()
    .positive('Valor deve ser positivo')
    .max(99999999, 'Valor muito alto'),
  due_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  customer: z.string().max(255).optional().nullable(),
  payment_method: z.string().max(100).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  document_number: z.string().max(100).optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo'),
  type: z.enum(['expense', 'income']),
  description: z.string().max(500).optional().nullable(),
});

export type AccountPayableInput = z.infer<typeof accountPayableSchema>;
export type AccountReceivableInput = z.infer<typeof accountReceivableSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
