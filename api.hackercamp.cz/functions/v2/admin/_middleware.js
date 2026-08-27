import { allowCredentials, allowMethods, gracefulOptions, roleAuthorization } from "#lib/middleware.js";

export const onRequest = [
  allowMethods(["GET", "POST", "OPTIONS"]),
  allowCredentials,
  gracefulOptions,
  roleAuthorization("admin")
];
