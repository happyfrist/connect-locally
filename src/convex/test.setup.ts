/// <reference types="vite/client" />

/**
 * Test-only module map. This file is not imported by any deployed Convex
 * function, so it is not included in the production bundle.
 */
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
