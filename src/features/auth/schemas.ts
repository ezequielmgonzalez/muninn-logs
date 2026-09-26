import { z } from "zod";

import { routing } from "@/i18n/routing";

export const localeSchema = z.enum(routing.locales);

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/);

// Mirrors the check constraint on profiles.username.
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/);

// Mirrors the check constraint on profiles.display_name.
export const displayNameSchema = z.string().trim().min(1).max(50);
