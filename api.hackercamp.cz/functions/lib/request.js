/**
 * @param {Request} request
 * @returns {Promise<*>}
 */
export function getPayload(request) {
  const contentType = request.headers.get("Content-Type");
  if (contentType === "application/json") {
    return request.json();
  }
  return request.formData().then(x => Object.fromEntries(x));
}
