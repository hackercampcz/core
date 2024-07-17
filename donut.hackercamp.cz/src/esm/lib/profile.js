import { withAuthHandler } from "./remoting.js";

export async function signIn(
  { idToken, slackProfile, slackToken, slackAccessToken },
  apiURL,
) {
  const contact = await getContactFromDb(
    slackProfile.id,
    slackProfile.email,
    apiURL,
  );
  setContact(contact);
  localStorage.setItem("hc:id_token", idToken);
  localStorage.setItem("slack:id_token", slackToken);
  localStorage.setItem("slack:access_token", slackAccessToken);
  localStorage.setItem("slack:profile", JSON.stringify(slackProfile));
  window.dispatchEvent(new Event("hc:profile"));
  return slackProfile;
}

export function signOut(apiURL) {
  localStorage.removeItem("hc:id_token");
  localStorage.removeItem("hc:contact");
  localStorage.removeItem("slack:id_token");
  localStorage.removeItem("slack:access_token");
  localStorage.removeItem("slack:profile");
  location.assign(apiURL("/v2/auth/sign-out"));
}

async function getContactFromDb(slackID, email, apiUrl) {
  const params = new URLSearchParams({ slackID, email });
  const resp = await withAuthHandler(
    fetch(apiUrl(`contacts?${params}`), {
      credentials: "include",
    }),
    {
      onUnauthenticated() {
        setReturnUrl(location.href);
        return new Promise((resolve, reject) => {
          signOut(apiUrl);
          reject({ unauthenticated: true });
        });
      },
    },
  );
  return resp.json();
}

export function getContact() {
  return JSON.parse(localStorage.getItem("hc:contact"));
}

export function setContact(contact) {
  localStorage.setItem("hc:contact", JSON.stringify(contact));
  window.dispatchEvent(new Event("hc:profile"));
}

export function getSlackProfile() {
  return JSON.parse(localStorage.getItem("slack:profile"));
}

export function setReturnUrl(href) {
  localStorage.setItem("hc:returnUrl", href);
}

export function handleReturnUrl() {
  const returnUrl = localStorage.getItem("hc:returnUrl");
  if (returnUrl) {
    localStorage.removeItem("hc:returnUrl");
  }
  location.assign(returnUrl ?? "/");
}

export function isSignedIn() {
  // TODO: validate token expiration
  return Boolean(localStorage.getItem("hc:id_token"));
}

export function getSlackAccessToken() {
  return localStorage.getItem("slack:access_token");
}
