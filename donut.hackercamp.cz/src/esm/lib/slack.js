export async function getSlackProfile(uid, token) {
  const resp = await fetch("https://slack.com/api/users.profile.get", {
    method: "POST",
    body: new URLSearchParams({ token, user: uid }),
  });
  const { profile } = await resp.json();
  return profile;
}

export async function setSlackProfile(uid, token, { name, value }) {
  const resp = await fetch("https://slack.com/api/users.profile.set", {
    method: "POST",
    body: new URLSearchParams({ token, user: uid, name, value }),
  });
  const { profile } = await resp.json();
  return profile;
}
