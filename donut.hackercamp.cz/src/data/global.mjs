function byVariant({ name, type }) {
  return (x) => x.type === type && x.variant === name;
}

export default {
  meta: {
    lang: "cs"
  },
  get currentYear() {
    return new Date().getFullYear();
  },
  year: 2025,
  event: {
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
    details: "Zažijte kemp pro ty, kteří chtějí lepší budoucnost.",
  },
  ticket: {
    nonprofit: { name: "Táborník z neziskovky", price: 3000 },
    hacker: { name: "Hacker", price: 7000 },
    "hacker-plus": { name: "Hacker filantrop", price: 12000 },
    "hacker-patron": { name: "Patron Campu", price: 12000 },
  },
  byVariant,
};
