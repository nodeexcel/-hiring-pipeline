import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  role: z.enum(["admin", "reviewer"]),
});

export const setRoleSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "reviewer"]),
});

export const setActiveSchema = z.object({
  id: z.string().uuid(),
  active: z.enum(["0", "1"]).transform((v) => v === "1"),
});
