export default {
  name: "Hacker Camp",
  startDate: new Date("2026-08-27T17:00:00+02:00"),
  endDate: new Date("2026-08-30T12:00:00+02:00"),
  get willStartSoon() {
    return willStartSoon(this);
  },
  isRegistrationOpen: false,
  location: "Sobeňák, Starý Rožmitál 148, Rožmitál pod Třemšínem",
  details: "Zažijte kemp pro ty, kteří chtějí lepší budoucnost."
};

export function isEnded({ endDate, startDate }, year) {
  return year < startDate.getFullYear() || endDate < new Date();
}

export function willStartSoon({ endDate, startDate }) {
  const today = new Date();
  const threeDaysBefore = new Date(startDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  threeDaysBefore.setHours(0, 0, 0, 0);
  return threeDaysBefore <= today && today <= endDate;
}
