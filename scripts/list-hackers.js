import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb@master/mod.ts";

const dynamo = createClient();

async function getContacts(invoiceId) {
  const result = await dynamo.scan({
    TableName: "hc-contacts",
    ProjectionExpression: "email",
  });
  return result.Items.map((x) => x.email);
}

const contacted = new Set([
  "vit.soural@flatzone.cz",
  "jirisvoboda99@gmail.com",
  "tomas.mihle@gmail.com",
  "sinacek@gmail.com",
  "martin.ondas@bizmachine.com",
  "vena.kubik@seznam.cz",
  "ivan@appsatori.eu",
  "michal@happinessatwork.cz",
  "petr.mihle@gmail.com",
  "rdpanek@canarytrace.com",
  "tota@trigema.cz",
  "lad.vasek@gmail.com",
  "denisa.lau@gmail.com",
  "honzakelin@gmail.com",
  "peter.kisel@cyrkl.com",
  "bartek@flatzone.cz",
  "david.chobotsky@bizztreat.com",
  "info@tunasec.com",
  "natalie@hlidacstatu.cz",
  "ondrej.tupy@topmonks.com",
  "jan.perla.jr@gmail.com",
  "eva.hankusova@bizztreat.com",
  "ondrej.svoboda@topmonks.com",
  "y.dominik.polak@gmail.com",
  "filip@investown.cz",
  "martin@futureportprague.com",
  "michal.vorac@netvor.co",
  "daniel.hromada@topmonks.com",
  "tomas.severyn@gmail.com",
  "tuckovaz@gmail.com",
  "jakub@reframecircle.cz",
  "annamarie.rybackova@applifting.cz",
  "d.trzil@gmail.com",
  "soldat@ppcbee.com",
  "monika@marekova.com",
  "tomas.hujer@topmonks.com",
  "jiri.fabian@topmonks.com",
  "matolin.matej@gmail.com",
  "vojtech@toulec.cz",
  "tomas.trnka@live.com",
  "jakub.cisar@novalia.cz",
  "jontesek@gmail.com",
  "pavel.samcenko@netvor.co",
  "lukas.navesnik@cesko.digital",
  "lucie.jury@gmail.com",
  "olga.maximova@czechitas.cz",
  "hello@danielfranc.com",
  "kalous@flatzone.cz",
  "pavel@roivenue.com",
  "ondrej.lanc@bizztreat.com",
  "tomas.netusil@netvor.co",
  "filip.kirschner@applifting.cz",
  "jan.fiedler@topmonks.com",
  "radek.svicka@liftago.com",
  "t.a.annamai@gmail.com",
  "petr@virtii.com",
  "dan@kessl.net",
  "petr@hlidacstatu.cz",
  "patrik.ras@liftago.com",
  "vankova.terezaa@gmail.com",
  "poliacik@kritickemyslenie.sk",
  "jakub.dusek@topmonks.com",
  "semorad.jaroslav@flatzone.cz",
  "navratilova.t@gmail.com",
  "lukas.pitter@2fresh.cz",
  "lenka@prg.ai",
  "matyas.lustig@shipmonk.com",
  "jiri.opletal@gmail.com",
  "havryluk@alza.cz",
  "lan.vu@topmonks.com",
  "kobela@kritickemyslenie.sk",
  "michal@michalblaha.cz",
  "milan.formanek@czechitas.cz",
  "veronika.sussova@ataccama.com",
  "tomas.belada@ataccama.com",
  "kotmel@operatorict.cz",
  "jirka.jansa@topmonks.com",
  "lenka@hlidacstatu.cz",
  "lucie.burisin@gmail.com",
  "adam@influencer.cz",
  "filip.holec@gmail.com",
  "dalibor.pulkert@outboxers.com",
  "martin@kadlcik.com",
  "herrhomola@gmail.com",
  "tereza.gagnon@cesko.digital",
  "sladek@contember.com",
  "petr.vnenk@applifting.cz",
  "filip@dousek.com",
  "matous@nation1.vc",
  "radekduha.cz@gmail.com",
  "vojta.rocek@gmail.com",
  "marija.krasicenko@applifting.cz",
  "jakub.vraspir@bizmachine.com",
  "petra.horackova@bizztreat.com",
  "petra.vojnova@topmonks.com",
  "petr@blabu.com",
  "aadel.sykor@gmail.com",
  "dita@czechitas.cz",
  "barbora.hinnerova@clevermaps.io",
  "ondrej@liftago.com",
  "antonina.nesmelova@topmonks.com",
  "eva@cesko.digital",
  "lukas.valenta@applifting.cz",
  "torokova.simona@gmail.com",
  "veronika.spryslova@bizztreat.com",
  "boleslav.kerous@mensa.cz",
  "martin.nedved@aimsapi.com",
  "bartas@ppcbee.com",
  "vilena.taraskina@gmail.com",
  "dominik.dedicek@integritty.cz",
  "linhart@flatzone.cz",
  "jaroslav.faltus@gmail.com",
  "jirisvoboda99@gmail.com",
  "tomas.hujer@topmonks.com",
  "matolin.matej@gmail.com",
  "pavel@roivenue.com",
  "matej@worki.cz",
  "sladek@contember.com",
  "radekduha.cz@gmail.com",
  "vilena.taraskina@gmail.com",
  "dita@czechitas.cz",
  "vojtech@toulec.cz",
  "tomas.netusil@netvor.co",
  "jakub.balada@gmail.com",
  "tomas.trnka@live.com",
  "lukas.navesnik@cesko.digital",
  "lenka@hlidacstatu.cz",
  "jiri.fabian@topmonks.com",
  "filip.holec@gmail.com",
  "ondrej.svoboda@topmonks.com",
  "ir@izatlouk.cz",
  "ales@roubicek.name",
  "tuckovaz@gmail.com",
  "annamarie.rybackova@applifting.cz",
  "lad.vasek@gmail.com",
  "daniel.hromada@topmonks.com",
  "filip@investown.cz",
  "ondrej.cejka@czechitas.cz",
  "boleslav.kerous@mensa.cz",
  "jan.fiedler@topmonks.com",
  "sinacek@gmail.com",
  "karolina@apify.com",
  "veronika.sussova@ataccama.com",
  "pavla.verflova@czechitas.cz",
  "lukas.valenta@applifting.cz",
  "matyas.lustig@shipmonk.com",
  "petr.mihle@gmail.com",
  "lan.vu@topmonks.com",
  "petra.havelkova@czechitas.cz",
  "martin.nedved@aimsapi.com",
  "katacek@gmail.com",
  "jirka.jansa@topmonks.com",
  "eva.hankusova@bizztreat.com",
  "michal.vorac@netvor.co",
  "natalie@hlidacstatu.cz",
  "jakub.dusek@topmonks.com",
  "zuzana.kropacova@czechitas.cz",
  "petra.vojnova@topmonks.com",
  "tomas.severyn@gmail.com",
  "jaroslav.faltus@gmail.com",
  "tomas.belada@ataccama.com",
  "martin.ondas@bizmachine.com",
  "pav.kosina@gmail.com",
  "milan.formanek@czechitas.cz",
  "petra.horackova@bizztreat.com",
  "soldat@ppcbee.com",
  "petr@blabu.com",
  "jirka@fenekpr.cz",
  "petr@hlidacstatu.cz",
  "michal@michalblaha.cz",
  "ondrej.lanc@bizztreat.com",
  "veronika.spryslova@bizztreat.com",
  "d.trzil@gmail.com",
  "adam@influencer.cz",
  "veronika.hallerova@topmonks.com",
  "bb.petrikova@gmail.com",
  "dalibor.pulkert@outboxers.com",
  "petr.vnenk@applifting.cz",
  "ondra@apify.com",
  "pavel.trnka@topmonks.com",
  "rdpanek@canarytrace.com",
  "eva@cesko.digital",
  "filip.kirschner@applifting.cz",
]);

async function main({}) {
  const allContacts = await getContacts();
  const toContact = allContacts.filter((x) => !contacted.has(x));
  console.log(allContacts.length);
  console.log(contacted.size);
  const encoder = new TextEncoder();
  await Deno.writeFile(
    "./data/to-contact.json",
    encoder.encode(JSON.stringify(toContact))
  );
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-write --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config list-hackers.js
