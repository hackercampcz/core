/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/**
 * @param {Record<string, any> | string} body
 * @param {Record<string, boolean | number | string>} [headers]
 * @returns {APIGatewayProxyResult}
 */
export function response(body, headers) {
  return {
    statusCode: 200,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
  };
}

/**
 * @returns {APIGatewayProxyResult}
 */
export function accepted(body = "") {
  return {
    statusCode: 202,
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

/**
 * @param {string} location
 * @returns {APIGatewayProxyResult}
 */
export function movedPermanently(location) {
  return {
    statusCode: 301,
    headers: { Location: location },
    body: "",
  };
}

/**
 * @param {string} location
 * @param {Record<string, boolean | number | string>} [headers]
 * @returns {APIGatewayProxyResult}
 */
export function found(location, headers) {
  return {
    statusCode: 302,
    headers: Object.assign({ Location: location }, headers),
    body: "",
  };
}

/**
 * @param {string} location
 * @returns {APIGatewayProxyResult}
 */
export function seeOther(location) {
  return {
    statusCode: 303,
    headers: { Location: location },
    body: "",
  };
}

/**
 * @param {{[p: string]: boolean | number | string}|undefined} headers
 * @returns {APIGatewayProxyResult}
 */
export function unauthorized(headers = {}) {
  return {
    statusCode: 401,
    body: "",
    headers,
  };
}

/**
 * @param {{[p: string]: boolean | number | string}|undefined} headers
 * @returns {APIGatewayProxyResult}
 */
export function forbidden(headers = {}) {
  return {
    statusCode: 403,
    body: "",
    headers,
  };
}

/**
 * @param {Record<string, any>} body
 * @returns {APIGatewayProxyResult}
 */
export function notFound(body = { error: "Data not found" }) {
  return {
    statusCode: 404,
    body: JSON.stringify(body),
  };
}

/**
 * @returns {APIGatewayProxyResult}
 */
export function unprocessableEntity() {
  return {
    statusCode: 422,
    body: "",
  };
}

/**
 * @returns {APIGatewayProxyResult}
 */
export function internalError() {
  return {
    statusCode: 500,
    body: "",
  };
}

/**
 * @callback ResponseTransformer
 * @param {APIGatewayProxyResult} in
 * @returns {APIGatewayProxyResult}
 */
/**
 * @param {string | string[]} methods
 * @param {string} [origin]
 * @return {ResponseTransformer}
 */
export function withCORS(methods, origin = "*", { allowCredentials } = {}) {
  const allowMethods = Array.isArray(methods) ? methods.join() : methods;
  return (x) =>
    Object.assign({}, x, {
      headers: Object.assign({}, x.headers, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": allowMethods,
        "Access-Control-Allow-Headers": [
          "Accept",
          "Authorization",
          "Cookie",
          "Content-Type",
          "X-Amz-Date",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ].join(),
        "Access-Control-Allow-Credentials": allowCredentials,
      }),
    });
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Object}
 */
export function readPayload(event) {
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;

  if (getHeader(event.headers, "Content-Type") === "application/json") {
    return JSON.parse(body);
  }
  return Object.fromEntries(new URLSearchParams(body).entries());
}

export function getHeader(headers, name) {
  return headers?.[name] ?? headers?.[name.toLowerCase()];
}
