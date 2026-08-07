import { allowCredentials, authorization } from "#lib/middleware.js";

export const onRequest = [allowCredentials];
export const onRequestPost = [authorization];
