export function signIn({ idToken, slackProfile, slackToken }) {
  localStorage.setItem("hc:id_token", idToken);
  localStorage.setItem("slack:id_token", slackToken);
  localStorage.setItem("slack:profile", JSON.stringify(slackProfile));
  window.dispatchEvent(new Event("hc:profile"));
  return slackProfile;
}

export function signOut() {
  localStorage.removeItem("hc:id_token");
  localStorage.removeItem("slack:id_token");
  localStorage.removeItem("slack:profile");
  window.dispatchEvent(new Event("hc:profile"));
  location.assign("/");
}

export function getSlackProfile() {
  return JSON.parse(localStorage.getItem("slack:profile"));
}

export function setReturnUrl(href) {
  localStorage.setItem("hc:returnUrl", href);
}

export function handleReturnUrl() {
  const returnUrl = localStorage.getItem("hc:returnUrl");
  if (!returnUrl) return;
  localStorage.removeItem("hc:returnUrl");
  location.assign(returnUrl);
}

export function isSignedIn() {
  // TODO: validate token expiration
  return Boolean(localStorage.getItem("hc:id_token"));
}
