import { roleAuthorization } from "../../lib/auth.js";
import { allowCredentials } from "../../lib/middleware.js";

export const onRequest = [roleAuthorization("admin"), allowCredentials];
