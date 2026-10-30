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
  }),
});
