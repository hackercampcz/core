import { allowCredentials, authorization } from "#lib/middleware.js";

export const onRequest = [allowCredentials];
export const onRequestGet = [authorization];
export const onRequestPost = [authorization];
