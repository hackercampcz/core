export default {
  nonprofit: { name: "Táborník z neziskovky", price: 3000 },
  hacker: { name: "Hacker", price: 7000 },
  "hacker-plus": { name: "Hacker filantrop", price: 12000 },
  "hacker-patron": { name: "Patron Campu", price: 12000 }
};

export const ticketName = new Map([
  ["nonprofit", "Táborník z neziskovky"],
  ["hacker", "Hacker"],
  ["hacker-plus", "Hacker filantrop"],
  ["hacker-patron", "Patron Campu"],
  ["volunteer", "Dobrovolník"],
  ["crew", "Crew"],
  ["staff", "Ostatní"]
]);

export const ticketPrice = new Map([
  [
    2022,
    new Map([
      ["nonprofit", 2500],
      ["hacker", 5000],
      ["hacker-plus", 7500],
      ["hacker-patron", 7500],
      ["volunteer", 0],
      ["crew", 0],
      ["staff", 0]
    ])
  ],
  [
    2023,
    new Map([
      ["nonprofit", 3000],
      ["hacker", 6000],
      ["hacker-plus", 9000],
      ["hacker-patron", 9000],
      ["volunteer", 0],
      ["crew", 0],
      ["staff", 0]
    ])
  ],
  [
    2024,
    new Map([
      ["nonprofit", 3000],
      ["hacker", 7000],
      ["hacker-plus", 12000],
      ["hacker-patron", 12000],
      ["volunteer", 0],
      ["crew", 0],
      ["staff", 0]
    ])
  ],
  [
    2025,
    new Map([
      ["nonprofit", 3000],
      ["hacker", 7000],
      ["hacker-plus", 12000],
      ["hacker-patron", 12000],
      ["volunteer", 0],
      ["crew", 0],
      ["staff", 0]
    ])
  ],
  [
    2026,
    new Map([
      ["nonprofit", 3000],
      ["hacker", 7000],
      ["hacker-plus", 12000],
      ["hacker-patron", 12000],
      ["volunteer", 0],
      ["crew", 0],
      ["staff", 0]
    ])
  ]
]);
