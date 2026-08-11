import { allowCredentials, gracefulOptions, roleAuthorization } from "#lib/middleware.js";

export const onRequest = [allowCredentials, gracefulOptions];
export const onRequestGet = [roleAuthorization("admin")];
