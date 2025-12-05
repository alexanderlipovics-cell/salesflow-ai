/**
 * Lead Form Validation Schema
 * 
 * Zod schema for lead creation/editing
 * Single source of truth for validation
 * 
 * @author Gemini 3 Ultra - Forms Architecture
 */

import { z } from "zod";

// Zod Schema Definition
export const leadSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Name muss mindestens 2 Zeichen lang sein." })
    .max(100, { message: "Name darf maximal 100 Zeichen lang sein." }),
  
  email: z
    .string()
    .email({ message: "Bitte eine gültige E-Mail-Adresse eingeben." }),
  
  company: z
    .string()
    .min(1, { message: "Firmenname ist erforderlich." })
    .max(200, { message: "Firmenname darf maximal 200 Zeichen lang sein." }),
  
  budget: z.enum(["low", "medium", "high", "enterprise"], {
    errorMap: () => ({ message: "Bitte ein Budget auswählen." }),
  }),
  
  notes: z
    .string()
    .max(500, { message: "Maximal 500 Zeichen erlaubt." })
    .optional(),
});

// Automatische TypeScript Type Inference
export type LeadFormData = z.infer<typeof leadSchema>;

