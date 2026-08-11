import { allowCredentials, allowMethods, authorization, gracefulOptions } from "#lib/middleware.js";

export const onRequest = [allowCredentials, allowMethods(["GET", "POST", "OPTIONS"]), gracefulOptions, authorization];
