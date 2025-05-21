const noop = () => {
};

/**
 * @param {Promise<Response>} response
 * @param {function()} onUnauthenticated
 * @param {function()} onUnauthorized
 * @returns {Promise<Response | undefined>}
 */
export async function withAuthHandler(
  response,
  { onUnauthenticated, onUnauthorized } = { onUnauthenticated: noop, onUnauthorized: noop }
) {
  const resp = await response;
  if (resp.status === 401) {
    return onUnauthenticated();
  } else if (resp.status === 403) {
    return onUnauthorized();
  }
  return resp;
}

export async function withErrorReporting(response, { rollbar, onError }) {
  try {
    const resp = await response;
    if (!resp.ok) {
      const error = await resp.json();
      if (rollbar) rollbar.error(error);
      if (onError) onError(error);
    }
    return resp;
  } catch (err) {
    if (rollbar) rollbar.error(err);
    if (onError) onError(err);
    return response;
  }
}

export function submitDecorator(handler) {
  return async function(e) {
    e.preventDefault();
    const body = e.target.ownerDocument.body;
    const button = e.target.querySelector("button[type=submit]");

    button.disabled = true;
    body.classList.add("wurk-too-hard");

    await handler(e);

    button.disabled = false;
    body.classList.remove("wurk-too-hard");
  };
}
