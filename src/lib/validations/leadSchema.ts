/**
 * Lead Form Validation Schema
 * 
 * Zod schema for lead creation/editing
 * Single source of truth for validation
 * 
 * @author Gemini 3 Ultra - Forms Architecture
 */

import { z } from "zod";

// Helper to allow empty strings on optional text fields
const emptyToUndefined = (val: string | undefined) => (val === "" ? undefined : val);

// Zod Schema Definition
export const leadSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Name muss mindestens 2 Zeichen lang sein." })
    .max(100, { message: "Name darf maximal 100 Zeichen lang sein." }),

  email: z
    .union([
      z.string().email({ message: "Bitte eine gültige E-Mail-Adresse eingeben." }),
      z.literal(""),
      z.undefined(),
    ])
    .transform(emptyToUndefined),

  company: z
    .union([z.string().max(200, { message: "Firmenname darf maximal 200 Zeichen lang sein." }), z.literal(""), z.undefined()])
    .transform(emptyToUndefined),

  phone: z
    .union([z.string(), z.literal(""), z.undefined()])
    .optional()
    .transform(emptyToUndefined),

  budget: z
    .union([
      z.enum(["low", "medium", "high", "enterprise"], {
        errorMap: () => ({ message: "Bitte ein Budget auswählen." }),
      }),
      z.literal(""),
      z.undefined(),
    ])
    .transform(emptyToUndefined)
    .optional(),

  notes: z
    .union([z.string().max(500, { message: "Maximal 500 Zeichen erlaubt." }), z.literal(""), z.undefined()])
    .transform(emptyToUndefined)
    .optional(),
});

// Automatische TypeScript Type Inference
export type LeadFormData = z.infer<typeof leadSchema>;

