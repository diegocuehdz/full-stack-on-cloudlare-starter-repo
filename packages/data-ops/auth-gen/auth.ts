import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { createBetterAuth } from "@/auth";

export const auth: ReturnType<typeof betterAuth> = createBetterAuth(drizzleAdapter(
  {},
  {
    provider: "sqlite",
  }
), "")