import { url } from "#lib/url.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env }) {
  const calendarId = env.GOOGLE_CALENDAR_PROGRAM_ID;
  const time = new Date().toISOString();
  const params = new URLSearchParams({
    key: env.GOOGLE_API_KEY,
    timeMin: time
  });
  console.log(url`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`);
  const resp = await fetch(url`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`);
  const { items, ...rest } = await resp.json();
  console.log(rest);
  const result = items?.map(x => {
    const [title, location] = x.summary.split(" @ ");
    x.title = title;
    x.location = location;
    return x;
  })?.map(({ title, location, description, start, end, extendedProperties }) => ({
    id: extendedProperties.shared.id,
    title,
    location,
    description,
    start: start.dateTime,
    end: end.dateTime,
    color: extendedProperties.shared.color
  }))?.sort((a, b) => a.start.localeCompare(b.start)) ?? [];
  return Response.json(Array.from(Map.groupBy(result, x => new Date(x.start).getDay())));
}
