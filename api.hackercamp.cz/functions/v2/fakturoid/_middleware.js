import { roleAuthorization } from "../../lib/auth.js";

export const onRequest = [roleAuthorization("admin")];
