import { allowCredentials, allowMethods, authorization } from "#lib/middleware.js";

export const onRequest = [allowCredentials, allowMethods(["GET", "POST", "OPTIONS"])];
export const onRequestGet = [authorization];
export const onRequestPost = [authorization];
