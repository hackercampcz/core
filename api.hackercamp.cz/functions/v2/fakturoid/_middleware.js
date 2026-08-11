import { allowCredentials, gracefulOptions, roleAuthorization } from "#lib/middleware.js";

export const onRequest = [allowCredentials, gracefulOptions, roleAuthorization("admin")];
