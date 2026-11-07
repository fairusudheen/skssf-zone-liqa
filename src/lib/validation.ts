import { z } from "zod";
import { BRANCHES, ROLES } from "./constants";
import { normalizePhone } from "./phone";

function countLetters(value: string): number {
  return (value.match(/[\p{L}\p{M}]/gu) || []).length;
}

export const registrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "name-required")
    .max(100, "name-too-long")
    .refine((value) => countLetters(value) >= 2, "name-too-short"),
  phone: z.preprocess(
    (value) => (typeof value === "string" ? normalizePhone(value) : value),
    z
      .string()
      .regex(/^[6-9]\d{9}$/, "invalid-phone"),
  ),
  branch: z.enum(BRANCHES, { message: "invalid-branch" }),
  role: z.enum(ROLES, { message: "invalid-role" }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const attendanceSchema = z.object({
  token: z.string().trim().min(1).max(200),
});
