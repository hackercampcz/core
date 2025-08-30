export default {
  name: "Hacker Camp",
    startDate: new Date("2025-08-28T17:00:00+02:00"),
    endDate: new Date("2025-08-31T12:00:00+02:00"),
    get willStartSoon() {
    const today = new Date();
    const threeDaysBefore = new Date(this.startDate);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
    threeDaysBefore.setHours(0, 0, 0, 0);
    return threeDaysBefore <= today && today <= this.endDate;
  },
  isRegistrationOpen: true,
    location: "Sobeňák, Starý Rožmitál 148, Rožmitál pod Třemšínem",
    details: "Zažijte kemp pro ty, kteří chtějí lepší budoucnost."
};
