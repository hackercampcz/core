import { allowCredentials, roleAuthorization } from "#lib/middleware.js";

export const onRequest = [roleAuthorization("admin"), allowCredentials];
