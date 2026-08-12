import { allowCredentials, gracefulOptions, authorization } from "#lib/middleware.js";

export const onRequest = [allowCredentials, gracefulOptions, authorization];
