export function iCal(startDate, endDate) {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//hckr.camp//Donut
CALSCALE:GREGORIAN
BEGIN:VTIMEZONE
TZID:Europe/Prague
LAST-MODIFIED:20240422T053450Z
TZURL:https://www.tzurl.org/zoneinfo-outlook/Europe/Prague
X-LIC-LOCATION:Europe/Prague
BEGIN:DAYLIGHT
TZNAME:CEST
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTAMP:${new Date().toISOString().replaceAll(/[-:]/g, "").substring(0, 15)}Z
UID:${crypto.randomUUID()}@hckr.camp
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
SUMMARY:Hacker Camp
URL:https://www.hackercamp.cz/
LOCATION:Sobeňák\\, Starý Rožmitál 148\\, 262 42 Rožmitál pod Třemšínem
ORGANIZER;CN="Hacker Camp Crew":MAILTO:team@hackercamp.cz
END:VEVENT
END:VCALENDAR`;
}

export function calendarEvent(startDate, endDate) {
  return btoa(
    encodeURIComponent(iCal(startDate, endDate)).replace(
      /%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode(`0x${p1}`)
    )
  );
}
