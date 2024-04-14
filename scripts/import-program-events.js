import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { readCSVObjects } from "https://deno.land/x/csv@v0.7.5/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb@master/mod.ts";

const dynamo = createClient();

const lineup = new Map([
  ["1_Mainframe (byznys&life)", "limain"],
  ["2_Basecamp (data&devs)", "libase"],
  ["3_Backend (workshopy)", "liback"],
  ["4_Peopleware (sport&realx)", "lipeep"],
  ["5_WoodStack (hudební stage)", "liwood"],
  ["6_Jungle Release", "lijungle"],
  ["7_Doprovodný program", "liother"],
]);

const topic = new Map([
  ["Biohacking", "main-day-2-topic-1"],
  ["Digitalizace českého státu", "main-day-3-topic-3"],
  ["Firemní kultura, hiring, marketing", "main-day-3-topic-2"],
  ["Kultura a udržitelnost", "main-day-2-topic-3"],
  ["Live your dreams", "main-day-3-topic-1"],
  ["Nakoukněte pod pokličku jiným oborům a odvětvím", "main-day-2-topic-2"],
  ["New tech", "base-day-2-topic-3"],
  ["BI + Data", "base-day-3-topic-2"],
  ["DevOps", "base-day-3-topic-3"],
  ["Frontend talks", "base-day-2-topic-2"],
  ["User centric topics", "base-day-2-topic-1"],
  ["Community", "workshop-7"],
  ["Jak skrze komunity řešit úplně všechno", "workshop-6"],
  ["Legal", "workshop-1"],
  ["LEGO stavebnice a Leadership", "workshop-4"],
  ["Příprava startupového pitch decku", "workshop-5"],
  ["Storytelling, schůzky, design, leadership...", "back-day-2-workshop-1"],
  ["Workshop zvládání náročných rozhovorů", "workshop-3"],
  // ["Před slam poetry", ""],
  // ["oheň a kytara", ""],
  // ["open decks", ""],
  // ["team culture", ""],
  // ["telescop", ""],
]);

async function getAttendee(db, email) {
  if (!email) return null;
  const result = await db.scan({
    TableName: "attendees",
    ProjectionExpression: "slackID, events, image, slug, #n",
    FilterExpression: "email = :email",
    ExpressionAttributeNames: { "#n": "name" },
    ExpressionAttributeValues: { ":email": email },
  });
  return result.Items?.[0];
}

async function main({}) {
  const f = await Deno.open("./data/events-import.csv");
  for await (const e of readCSVObjects(f)) {
    const x1 = Object.fromEntries(
      Object.entries(e)
        .map(([k, v]) => [k.trim(), v.trim()])
        .filter(([k, v]) => Boolean(v))
        .filter(([k, v]) => v !== "null"),
    );
    const attendee = await getAttendee(dynamo, x1.email);
    if (!attendee) continue;
    const x2 = Object.assign(
      {},
      {
        _id: crypto.randomUUID(),
        year: 2022,
        title: x1.title,
        description: x1.description,
        duration: x1.duration?.split("M")?.[0]?.replace("1H", "60"),
        lineup: lineup.get(x1.Stage),
        topic: topic.get(x1.topic),
      },
    );
    const x3 = Object.fromEntries(
      Object.entries(x2).filter(([k, v]) => Boolean(v)),
    );
    if (x3.lineup !== "liback") continue;
    if (!x3.topic) continue;
    const events = (attendee.events ?? []).concat([x3]);
    console.log(x3);
    await dynamo.updateItem({
      TableName: "attendees",
      Key: { slackID: attendee.slackID, year: 2022 },
      UpdateExpression: "SET events = :events",
      ExpressionAttributeValues: { ":events": events },
    });

    const x4 = Object.assign({}, x3, {
      people: [
        {
          slackID: attendee.slackID,
          slug: attendee.slug,
          image: attendee.image,
          name: attendee.name,
        },
      ],
      approved: new Date().toISOString(),
      approvedBy: "U0202S9SB1T",
    });
    console.log(x4);
    await dynamo.putItem({ TableName: "program", Item: x4 });
  }
}

await main(parse(Deno.args));
