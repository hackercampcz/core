import { allowCredentials, allowMethods, gracefulOptions, roleAuthorization } from "#lib/middleware.js";

export const onRequest = [allowCredentials, allowMethods(["GET", "POST", "OPTIONS"]), gracefulOptions, roleAuthorization("admin")];
