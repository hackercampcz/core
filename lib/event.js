export default {
  name: "Hacker Camp",
  startDate: Temporal.ZonedDateTime.from("2026-08-27T17:00:00+02:00[Europe/Prague]"),
  endDate: Temporal.ZonedDateTime.from("2026-08-30T12:00:00+02:00[Europe/Prague]"),
  get willStartSoon() {
    return willStartSoon(this);
  },
  get today() {
    return Temporal.Now.plainDateISO();
  },
  isRegistrationOpen: true,
  location: "Sobeňák, Starý Rožmitál 148, Rožmitál pod Třemšínem",
  details: "Zažijte kemp pro ty, kteří chtějí lepší budoucnost."
};

export function isEnded({ endDate, startDate, today }, year) {
  return year < startDate.year // scheduled next year
    || Temporal.PlainDate.compare(endDate, today) === -1;
}

export function willStartSoon({ endDate, startDate, today }) {
  const threeDaysBefore = startDate.toPlainDate().subtract({ days: 3 });
  return Temporal.PlainDate.compare(threeDaysBefore, today) < 1 && Temporal.PlainDate.compare(today, endDate) < 1;
}
