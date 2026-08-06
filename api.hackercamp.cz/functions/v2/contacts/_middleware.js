import { allowCredentials, roleAuthorization } from "../../lib/middleware.js";

export const onRequest = [allowCredentials, roleAuthorization("admin")];
