function url(strings, ...values) {
  return String.raw({ raw: strings }, ...values.map(x => x instanceof URLSearchParams ? x : encodeURIComponent(x)));
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env }) {
  const calendarId = "c_afd9546ec33f93662ac0338da6d23a6b7daa6b5a1cc181afabaf6a8b11691b3a@group.calendar.google.com";
  const time = new Date().toISOString();
  const params = new URLSearchParams({
    key: env.GOOGLE_API_KEY,
    timeMin: time
  });
  console.log(url`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`);
  const resp = await fetch(url`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`);
  const { items, ...rest } = await resp.json();
  console.log(rest);
  const result = items?.map(({ summary, description, start, end, extendedProperties }) => ({
    id: extendedProperties.shared.id,
    summary,
    description,
    start: start.dateTime,
    end: end.dateTime,
    color: extendedProperties.shared.color
  }))?.sort((a, b) => a.start.localeCompare(b.start)) ?? [];
  return Response.json(result);
}
