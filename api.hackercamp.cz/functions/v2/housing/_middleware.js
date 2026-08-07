import { allowCredentials, authorization } from "#lib/middleware.js";

export const onRequestOptions = [allowCredentials];
export const onRequestGet = [allowCredentials, authorization];
export const onRequestPost = [allowCredentials, authorization];
