const DEFAULT_SUPABASE_URL = "https://rizeeehngwbregoxqksy.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_g1j1cIEex3jSh3pBoIEFQw_5VR6IKHY";

/**
 * Public client configuration.
 *
 * Supabase publishable keys are designed to be exposed to browser clients;
 * authorization is enforced by Postgres RLS. Vercel environment variables
 * still take precedence so deployments can be reconfigured without code
 * changes, while the checked-in fallback keeps preview builds deterministic.
 * Never add a service-role key here.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL,
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    DEFAULT_SUPABASE_PUBLISHABLE_KEY,
};
