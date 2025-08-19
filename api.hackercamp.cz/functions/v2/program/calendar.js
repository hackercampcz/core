/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env }) {
  const calendarId = "c_afd9546ec33f93662ac0338da6d23a6b7daa6b5a1cc181afabaf6a8b11691b3a%40group.calendar.google.com";
  const time = new Date().toISOString();
  const params = new URLSearchParams({
    key: env.GOOGLE_API_KEY,
    timeMin: time,
    orderBy: "startTime"
  });
  const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`);
  const { items } = await resp.json();
  const result = items.map(({ summary, description, start, end, extendedProperties }) => ({
    id: extendedProperties.shared.id,
    summary,
    description,
    start: start.dateTime,
    end: end.dateTime,
    color: extendedProperties.shared.color
  }));
  return Response.json(result);
}
