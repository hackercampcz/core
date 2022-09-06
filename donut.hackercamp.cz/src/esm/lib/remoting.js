const noop = () => {};

/**
 *
 * @param {Promise<Response>} response
 * @param {function()} onUnauthenticated
 * @param {function()} onUnauthorized
 * @returns {Promise<Response | undefined>}
 */
export async function withAuthHandler(
  response,
  { onUnauthenticated, onUnauthorized } = {
    onUnauthenticated: noop,
    onUnauthorized: noop,
  }
) {
  const resp = await response;
  if (resp.status === 401) {
    return onUnauthenticated();
  } else if (resp.status === 403) {
    return onUnauthorized();
  }
  return resp;
}
