import { withAuthHandler } from "./remoting.js";
import { SafeStorage } from "./storage.js";

const storage = new SafeStorage(localStorage);

export async function signIn({ idToken, slackProfile, slackToken, slackAccessToken }, apiURL) {
  const contact = await getContactFromDb(slackProfile.id ?? slackProfile.sub, slackProfile.email, apiURL);
  setContact(contact);
  storage.setItem("hc:id_token", idToken);
  storage.setItem("slack:id_token", slackToken);
  storage.setItem("slack:access_token", slackAccessToken);
  storage.setItem("slack:profile", JSON.stringify(slackProfile));
  window.dispatchEvent(new Event("hc:profile"));
  return slackProfile;
}

export function signOut(apiURL) {
  storage.removeItem("hc:id_token");
  storage.removeItem("hc:contact");
  storage.removeItem("slack:id_token");
  storage.removeItem("slack:access_token");
  storage.removeItem("slack:profile");
  location.assign(apiURL("/v2/auth/sign-out"));
}

async function getContactFromDb(slackID, email, apiUrl) {
  const params = new URLSearchParams({ slackID, email });
  const resp = await withAuthHandler(fetch(apiUrl(`contacts?${params}`), { credentials: "include" }), {
    onUnauthenticated() {
      setReturnUrl(location.href);
      return new Promise((resolve, reject) => {
        signOut(apiUrl);
        reject({ unauthenticated: true });
      });
    }
  });
  return resp.json();
}

export function getContact() {
  const item = storage.getItem("hc:contact");
  if (!item) return null;
  return JSON.parse(item);
}

export function setContact(contact) {
  storage.setItem("hc:contact", JSON.stringify(contact));
  window.dispatchEvent(new Event("hc:profile"));
}

export function getSlackProfile() {
  const item = storage.getItem("slack:profile");
  if (!item) return null;
  return JSON.parse(item);
}

export function setReturnUrl(href) {
  storage.setItem("hc:returnUrl", href);
}

export function handleReturnUrl() {
  const returnUrl = storage.getItem("hc:returnUrl");
  if (returnUrl) {
    storage.removeItem("hc:returnUrl");
  }
  location.assign(returnUrl ?? "/");
}

export function isSignedIn() {
  // TODO: validate token expiration
  return Boolean(storage.getItem("hc:id_token"));
}

export function getSlackAccessToken() {
  return storage.getItem("slack:access_token");
}
