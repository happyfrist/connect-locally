/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as circles from "../circles.js";
import type * as config from "../config.js";
import type * as http from "../http.js";
import type * as journal from "../journal.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_catalog from "../lib/catalog.js";
import type * as lib_matching from "../lib/matching.js";
import type * as lib_notify from "../lib/notify.js";
import type * as lib_policy from "../lib/policy.js";
import type * as moderation from "../moderation.js";
import type * as notifications from "../notifications.js";
import type * as people from "../people.js";
import type * as profiles from "../profiles.js";
import type * as reconnect from "../reconnect.js";
import type * as safety from "../safety.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  circles: typeof circles;
  config: typeof config;
  http: typeof http;
  journal: typeof journal;
  "lib/auth": typeof lib_auth;
  "lib/catalog": typeof lib_catalog;
  "lib/matching": typeof lib_matching;
  "lib/notify": typeof lib_notify;
  "lib/policy": typeof lib_policy;
  moderation: typeof moderation;
  notifications: typeof notifications;
  people: typeof people;
  profiles: typeof profiles;
  reconnect: typeof reconnect;
  safety: typeof safety;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
