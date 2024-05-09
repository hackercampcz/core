import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { sendEmailWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "#year,email,slackID,paid,ticketType",
    ExpressionAttributeNames: {
      "#year": "year",
    },
  });
  return result;
}

async function getContacts() {
  const result = await dynamo.scan({
    TableName: "contacts",
    ProjectionExpression: "email,slackID",
  });
  return result.Items;
}

const attendees2021 = new Set([
  "dan.trzil@gmail.com",
  "linhart@flatzone.cz",
  "vit.soural@flatzone.cz",
  "bartek@flatzone.cz",
  "kalous@flatzone.cz",
  "milan.formanek@czechitas.cz",
  "tomas@mavericks.legal",
  "jan.bleha@kiwi.com",
  "volodymyr.piskun@kiwi.com",
  "lukas.kubis@kiwi.com",
  "maros.dubiny@kiwi.com",
  "jonas.petrovsky@kiwi.com",
  "andrej.hanes@kiwi.com",
  "lukas.sevcik@kiwi.com",
  "tomas.brukner@kiwi.com",
  "petr.sevcik@kiwi.com",
  "jk@kiwi.com",
  "havryluk@alza.cz",
  "petr.bartos@medevio.cz",
  "martin.nedved@aimsapi.com",
  "petr.hamernik@geneea.com",
  "jiri@geneea.com",
  "lucia.becvarova@geneea.com",
  "michal@monitora.cz",
  "lad.vasek@gmail.com",
  "matolin.matej@gmail.com",
  "veronika.praskova83@gmail.com",
  "vojta.rocek@gmail.com",
  "jakub.cisar@novalia.cz",
  "kristina.gerzova@novalia.cz",
  "tomas.bachtik@novalia.cz",
  "tomas.trnka@live.com",
  "zatrochova@gmail.com",
  "radekduha.cz@gmail.com",
  "michal.vorac@netvor.co",
  "tomas.netusil@netvor.co",
  "info@tunasec.com",
  "ppskyva@gmail.com",
  "kuba.turner@gmail.com",
  "veronikadominikova@gmail.com",
  "jirisvoboda99@gmail.com",
  "fisa@keboola.com",
  "samuel.kozuch@keboola.com",
  "david@keboola.com",
  "michal.hruska@keboola.com",
  "martin.matejka@keboola.com",
  "vera.janicinova@czechitas.cz",
  "eva@cesko.digital",
  "pavel@roivenue.com",
  "peter.kisel@cyrkl.com",
  "matyas@revolt.bi",
  "giuliano@revolt.bi",
  "adam@revolt.bi",
  "karolina.everlingova@revolt.bi",
  "pavel.rezabek@revolt.bi",
  "dmytro.molokoiedov@revolt.bi",
  "michal.nevrkla@gmail.com",
  "javurek.mail@gmail.com",
  "boleslav.kerous@mensa.cz",
  "rdpanek@canarytrace.com",
  "ondrej@czechitas.cz",
  "lukas.valenta@applifting.cz",
  "filip.kirschner@applifting.cz",
  "daniel.kessl@applifting.cz",
  "vankova.terezaa@gmail.com",
  "torokova.simona@gmail.com",
  "zuzanastavjanova@gmail.com",
  "branislav.bencik@applifting.cz",
  "michal@michalblaha.cz",
  "natalie@hlidacstatu.cz",
  "lenka@hlidacstatu.cz",
  "eva.hankusova@bizztreat.com",
  "veronika.spryslova@bizztreat.com",
  "ondrej.lanc@bizztreat.com",
  "petra.horackova@bizztreat.com",
  "petr@blabu.com",
  "me@vitekjezek.com",
  "ondrej@liftago.com",
  "david@purposeventures.cz",
  "krystof.vosatka@ucitelnazivo.cz",
  "david.spunar@faceup.com",
  "ass@2fresh.cz",
  "benhor99@gmail.com",
  "trang@heureka.cz",
  "tomas.hylsky@heureka.cz",
  "jan.kahoun@heureka.cz",
  "zuzana.tuckova@heureka.cz",
  "david.smolka@heureka.cz",
  "daniel.hromada@topmonks.com",
  "jakub.dusek@topmonks.com",
  "jiri.fabian@topmonks.com",
  "bohumir.brocko@topmonks.com",
  "jan.fiedler@topmonks.com",
  "veronika.hallerova@topmonks.com",
  "ondrej.tupy@topmonks.com",
  "lan.vu@topmonks.com",
  "tomas.hujer@topmonks.com",
  "ondrej.svoboda@topmonks.com",
  "jirka.jansa@topmonks.com",
  "petra.vojnova@topmonks.com",
  "hana.uhrova@topmonks.com",
  "marie.polanska@czechitas.cz",
  "karin.fuentesova@ditigoo.cz",
  "michal@hackprague.com",
  "lukas@apify.com",
  "jakub.krob@apify.com",
  "jan@apify.com",
  "marek@apify.com",
  "martin@apify.com",
  "pavel@apify.com",
  "sam@apify.com",
  "oliver@apify.com",
  "jindrich.bar@apify.com",
  "annamarie.rybackova@applifting.cz",
  "petr.vnenk@applifting.cz",
  "adela.sykorova@czechitas.cz",
  "vojtech@toulec.cz",
  "papca@brandbrothers.com",
  "vanda@twigsee.com",
  "p.bobkov@gmail.com",
  "me@honzasladek.com",
  "marv@flowberry.cz",
  "tomas.severyn@gmail.com",
  "dita@czechitas.cz",
  "dominik.dedicek@integritty.cz",
  "matyas.lustig@shipmonk.com",
  "adam@influencer.cz",
  "jaroslav@influencer.cz",
  "bartas@ppcbee.com",
  "soldat@ppcbee.com",
  "sinacek@gmail.com",
  "eliska.kralov@seznam.cz",
  "jiri.necas@productboard.com",
  "filip.novotny@productboard.com",
  "jan.vaclavik@productboard.com",
  "jindrich@productboard.com",
  "pavel.hamrik@productboard.com",
  "vojtech.uhlir@productboard.com",
  "daniel@deepnote.com",
  "katerina.vackova@loono.cz",
  "sklardanielwork@gmail.com",
  "tomasjindra.iphone@gmail.com",
  "navratilova.t@gmail.com",
  "filip@investown.cz",
  "jan@deepnote.com",
  "daniel@deepnote.com",
  "michal.nevrkla@gmail.com",
  "tomas.belada@ataccama.com",
  "katerina.vackova@loono.cz",
  "zenisjan@gmail.com",
  "barbora.hinnerova@gmail.com",
  "jediny@twigsee.com",
  "vanda@twigsee.com",
  "petr.mihle@gmail.com",
  "martin.ondas@bizmachine.com",
  "xpokd06@gmail.com",
  "jiri.pisa@topmonk.com",
]);

const ignoredTickets = new Set(["volunteer", "staff", "crew", "nonprofit"]);

async function main({}) {
  // const contacts = await getContacts();
  const batches = await getAttendees();
  const bySlackID = new Map();
  for await (const batch of batches) {
    for (const attendee of batch.Items) {
      if (ignoredTickets.has(attendee.ticketType)) continue;
      const entries = bySlackID.get(attendee.slackID) ?? [];
      entries.push(attendee);
      bySlackID.set(attendee.slackID, entries);
    }
  }
  for (const [key, entries] of bySlackID) {
    if (entries.length === 1) bySlackID.delete(key);
    if (attendees2021.has(entries[0].email)) bySlackID.delete(key);
  }
  console.log(bySlackID.size);
  for (const [key, entries] of bySlackID) {
    console.log(entries[0].email);
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config attendees-stats.js
