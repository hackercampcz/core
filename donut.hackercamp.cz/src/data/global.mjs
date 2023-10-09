export default {
  year: 2023,
  event: {
    name: "Hacker Camp",
    startDate: new Date("2023-08-31T17:00:00+02:00"),
    endDate: new Date("2023-09-03T12:00:00+02:00"),
    get willStartSoon() {
      const today = new Date();
      const threeDaysBefore = new Date(this.startDate);
      threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
      threeDaysBefore.setHours(0, 0, 0, 0);
      return today >= threeDaysBefore;
    },
    location: "Sobeňák, Starý Rožmitál 148, Rožmitál pod Třemšínem",
    details:
      "Zažijte netradiční třídenní festival pro lidi z české tech scény.",
  },
};
