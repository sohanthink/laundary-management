import { z } from "zod";
import { isMoneyInput, toPoisha } from "./money";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState =
  | {
      ok?: boolean;
      message?: string;
      error?: string;
      fieldErrors?: FieldErrors;
    }
  | undefined;

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; state: ActionState };

export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): ParseResult<z.infer<T>> {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const flat = z.flattenError(result.error);
    return {
      success: false,
      state: {
        error: flat.formErrors[0] ?? "Please fix the highlighted fields.",
        fieldErrors: flat.fieldErrors as FieldErrors,
      },
    };
  }
  return { success: true, data: result.data };
}

export const text = (label = "This field") =>
  z.string().trim().min(1, `${label} is required`).max(200);

export const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : null));

export const money = (label = "Amount") =>
  z
    .string()
    .trim()
    .refine(isMoneyInput, `${label} must be a number like 120 or 120.50`)
    .transform(toPoisha);

export const optionalMoney = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isMoneyInput(v), "Must be a number like 120 or 120.50")
  .transform((v) => (v ? toPoisha(v) : 0));

export const positiveInt = (label = "Quantity") =>
  z.coerce
    .number({ message: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .positive(`${label} must be more than 0`);

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");

export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

export const id = z.string().min(1);
