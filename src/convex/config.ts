import { query } from "./_generated/server";
import { demoSeedEnabled, guestDemoEnabled } from "./lib/policy";

/**
 * Public, non-sensitive deployment capabilities. These flags never grant
 * access by themselves; the server checks the same environment variables on
 * every protected function.
 */
export const appConfig = query({
  args: {},
  handler: async () => ({
    demoSeedEnabled: demoSeedEnabled(process.env),
    guestAccessEnabled: guestDemoEnabled(process.env),
    // Presence of the gateway key is a deployment capability, not a secret.
    emailNotificationsAvailable: Boolean(process.env.VLY_INTEGRATION_KEY),
  }),
});
