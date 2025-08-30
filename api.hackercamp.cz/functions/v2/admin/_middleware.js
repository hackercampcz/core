import { allowCredentials, cors, roleAuthorization } from "../../lib/middleware.js";

export const onRequest = [cors, allowCredentials, roleAuthorization("admin")];
