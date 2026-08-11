import { allowCredentials, authorization, gracefulOptions } from "#lib/middleware.js";

export const onRequest = [allowCredentials, gracefulOptions];
export const onRequestPost = [authorization];
