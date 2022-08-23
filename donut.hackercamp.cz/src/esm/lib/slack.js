export async function getSlackProfile(uid, token) {
  const resp = await fetch("https://slack.com/api/users.profile.get", {
    method: "POST",
    body: new URLSearchParams({ token, user: uid }),
  });
  const { ok, error, profile } = await resp.json();
  if (ok) return profile;
  throw new Error("Get slack profile failed: " + error);
}

export async function setSlackProfile(uid, token, { name, value }) {
  const resp = await fetch("https://slack.com/api/users.profile.set", {
    method: "POST",
    body: new URLSearchParams({ token, user: uid, name, value }),
  });
  const { ok, error, profile } = await resp.json();
  if (ok) return profile;
  throw new Error("Set Slack profile failed: " + error);
}
