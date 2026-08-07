import { allowCredentials, roleAuthorization } from "#lib/middleware.js";

export const onRequest = [allowCredentials];
export const onRequestGet = [roleAuthorization("admin")];
