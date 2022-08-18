import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { response } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});


/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const params = Object.assign({ year: "2022" }, event.queryStringParameters);
  console.log({ method: "GET", params });
  return response([
      {
        "id": "ev1",
        "lineup": "liorg",
        "startAt": "2022-09-01T14:00:00",
        "endAt": "2022-09-01T20:00:00",
        "title": "Příjezdy a registrace",
        "_top": "8%"
      },
      {
        "id": "ev2",
        "lineup": "liorg",
        "startAt": "2022-09-01T17:00:00",
        "endAt": "2022-09-01T18:00:00",
        "title": "OFIKO BEGINNIG",
        "_top": "46%"
      },
      {
        "id": "ev3",
        "lineup": "limain",
        "startAt": "2022-09-01T17:00:00",
        "endAt": "2022-09-01T18:00:00",
        "title": "Ofiko zahájení campu",
        "description": "Rozhodneme si o programu na večer - podle zájmu rozdělíme talky do \"stagí\"",
        "_top": "2%"
      },
      {
        "id": "ev4",
        "lineup": "limain",
        "startAt": "2022-09-01T17:05:00",
        "endAt": "2022-09-01T18:00:00",
        "title": "Seznamovací kolečko",
        "description": "Hravou formou pojďme poznat, kdo na campu je a odkud přijel",
        "_top": "27%"
      },
      {
        "id": "ev5",
        "lineup": "limain",
        "startAt": "2022-09-01T17:10:00",
        "endAt": "2022-09-01T18:00:00",
        "title": "Seznamovací hry",
        "description": "Spíš pro hravější etroverty, co se nebojí vydat do nepoznaných vod (Ženďa)",
        "_top": "52%"
      },
      {
        "id": "ev6",
        "lineup": "limain",
        "startAt": "2022-09-01T17:10:00",
        "endAt": "2022-09-01T18:00:00",
        "title": "Speed Networking",
        "description": "Spíš povídání (temata navedou) (Ir)",
        "_top": "76%"
      },
      {
        "id":"ev7",
        "lineup": "liorg",
        "startAt": "2022-09-01T18:00:00",
        "endAt": "2022-09-01T20:00:00",
        "title": "Ideální doba se nadlábnout",
        "_top": "46%"
      },
      {
        "id":"ev8",
        "lineup": "liother",
        "startAt": "2022-09-01T17:15:00",
        "endAt": "2022-09-01T18:00:00",
        "title": "DJ Allessio Busta\nDisco guláš",
        "_top": "18%"
      },
      {
        "id": "ev9",
        "lineup": "liwood",
        "startAt": "2022-09-01T19:00:00",
        "endAt": "2022-09-01T20:00:00",
        "title": "DJ Quip",
        "_top": "27%"
      },
      {
        "id": "ev10",
        "lineup": "liwood",
        "startAt": "2022-09-01T20:50:00",
        "endAt": "2022-09-01T22:00:00",
        "title": "Kapitán DEMO",
        "_top": "30%",
        "level": 120
      },
      {
        "id": "ev11",
        "lineup": "liwood",
        "startAt": "2022-09-01T22:00:00",
        "endAt": "2022-09-01T24:00:00",
        "title": "Zrní zahraje u Ohně!",
        "_top": "8%",
        "level": 110
      },
      {
        "id": "ev12",
        "lineup": "lijungle",
        "startAt": "2022-09-01T22:00:00",
        "endAt": "2022-09-02T05:00:00",
        "title": "DJ Allessio Busta",
        "_top": "24%",
        "level": "160"
      },
      {
        "id": "ev13",
        "lineup": "liorg",
        "startAt": "2022-09-01T22:00:00",
        "endAt": "2022-09-01T24:00:00",
        "title": "Oheň a pečení buřtů",
        "level": "101",
        "_top": "52%"
      },
      {
        "id": "ev14",
        "lineup": "liorg",
        "startAt": "2022-09-01T24:00:00",
        "endAt": "2022-09-02T08:00:00",
        "title": "Noční klid :)",
        "_top": "36%"
      },
      {
        "id": "ev15",
        "lineup": "liorg",
        "startAt": "2022-09-02T08:00:00",
        "endAt": "2022-09-02T10:00:00",
        "title": "Dobré ráno, čas si dát kafe, snídani, ranní sprchu, výběh a tak"
      },
      {
        "id": "ev16",
        "lineup": "limain",
        "startAt": "2022-09-02T10:00:00",
        "endAt": "2022-09-02T11:00:00",
        "title": "Ofiko zahájení dne. Máte program? A mohla bych ho vidět?",
        "_top": "8%"
      },
      {
        "id": "ev17",
        "lineup": "limain",
        "startAt": "2022-09-02T10:30:00",
        "endAt": "2022-09-02T12:00:00",
        "title": "Digitalizace českého státu\na co pro ni můžeme udělat my",
        "_top": "48%",
        "level": 110
      },
      {
        "id": "ev18",
        "lineup": "liorg",
        "startAt": "2022-09-02T12:00:00",
        "endAt": "2022-09-02T14:00:00",
        "title": "Ideální doba se nadlábnout",
        "_top": "49%"
      },
      {
        "id": "ev19",
        "lineup": "liorg",
        "startAt": "2022-09-02T14:00:00",
        "endAt": "2022-09-02T16:00:00",
        "title": "Sejdeme se v mainfraime, program na další dvě hodniky + nové věci",
        "_top": "8%"
      },
      {
        "id": "ev20",
        "lineup": "limain",
        "startAt": "2022-09-02T14:00:00",
        "endAt": "2022-09-02T16:00:00",
        "title": "Nakoukněte pod pokličku jiným oborům a odvětvím",
        "description": "14:10 Chirurgie\n14:20 Hudba, akustika\n14:30 Městská logistika\n14:40 Cyklovýlety na 2 týdny\n14:50 Kritické myšlení",
        "level": 110,
        "type": "topic"
      },
      {
        "id": "ev21",
        "lineup": "libase",
        "startAt": "2022-09-02T14:00:00",
        "endAt": "2022-09-02T16:00:00",
        "title": "Frontend talks",
        "description": "",
        "level": 110,
        "type": "topic"
      },
      {
        "id": "ev22",
        "lineup": "lijungle",
        "startAt": "2022-09-02T14:00:00",
        "endAt": "2022-09-02T16:00:00",
        "title": "DJ workshop",
        "description": "Vyzkoušejte si, co vše musí DJ zvládnout - budem mít různé mixáky a technologie.",
        "_top": "33%",
        "level": 100
      },
      {
        "id": "ev23",
        "lineup": "liother",
        "startAt": "2022-09-02T14:00:00",
        "endAt": "2022-09-02T16:00:00",
        "title": "Mastermind skupina s Daliborem",
        "level": 110,
        "_top": "48%"
      },
      {
        "id": "ev24",
        "lineup": "liorg",
        "startAt": "2022-09-02T16:00:00",
        "endAt": "2022-09-02T18:00:00",
        "title": "Sejdeme se v mainfraime, program na další dvě hodniky + nové věci",
        "_top": "36%"
      },
      {
        "id": "ev25",
        "lineup": "limain",
        "startAt": "2022-09-02T16:00:00",
        "endAt": "2022-09-02T18:00:00",
        "title": "NGOs + udržitelnost",
        "description": "",
        "level": 110,
        "type": "topic"
      },
      {
        "id": "ev26",
        "lineup": "libase",
        "startAt": "2022-09-02T16:00:00",
        "endAt": "2022-09-02T18:00:00",
        "title": "New tech - AI, VR, NFTs in your business",
        "description": "",
        "level": 110,
        "type": "topic"
      },
      {
        "id": "ev27",
        "lineup": "liback",
        "startAt": "2022-09-02T16:00:00",
        "endAt": "2022-09-02T18:00:00",
        "title": "Lockpicking workshop",
        "description": "",
        "_top": "41%",
        "level": 110
      },
      {
        "id": "ev28",
        "lineup": "liother",
        "startAt": "2022-09-02T16:00:00",
        "endAt": "2022-09-02T18:00:00",
        "title": "Poriadok v hlave s Poldem",
        "level": 110,
        "_top": "37%"
      },
      {
        "id":"ev29",
        "lineup": "liorg",
        "startAt": "2022-09-02T18:00:00",
        "endAt": "2022-09-02T20:00:00",
        "title": "Ideální doba se nadlábnout",
        "_top": "29%"
      },
      {
        "id":"ev30",
        "lineup": "liwood",
        "startAt": "2022-09-02T19:00:00",
        "endAt": "2022-09-02T20:00:00",
        "title": "Tady něco bude",
        "_top": "19%",
        "level": 110
      },
      {
        "id": "ev31",
        "lineup": "limain",
        "startAt": "2022-09-02T20:10:00",
        "endAt": "2022-09-02T20:49:00",
        "title": "Slam poetry / standup",
        "description": "",
        "_top": "21%",
        "level": 110
      },
      {
        "id": "ev32",
        "lineup": "liwood",
        "startAt": "2022-09-02T20:50:00",
        "endAt": "2022-09-02T22:00:00",
        "title": "Ventolín",
        "description": "",
        "_top": "44%",
        "level": 120
      },
      {
        "id": "ev33",
        "lineup": "liorg",
        "startAt": "2022-09-02T22:00:00",
        "endAt": "2022-09-02T24:00:00",
        "title": "Oheň",
        "description": "",
        "_top": "47%",
        "level": 110
      },
      {
        "id": "ev34",
        "lineup": "limain",
        "startAt": "2022-09-02T22:10:00",
        "endAt": "2022-09-02T24:00:00",
        "title": "Z prdele slajdy (Jirka)",
        "description": "",
        "_top": "34%",
        "level": 110
      },
      {
        "id": "ev35",
        "lineup": "lijungle",
        "startAt": "2022-09-02T23:10:00",
        "endAt": "2022-09-03T02:00:00",
        "title": "DJ Allessio Busta, DJ Fromen, Ivan B.",
        "description": "",
        "_top": "21%",
        "level": 110
      },
      {
        "id": "ev36",
        "lineup": "liorg",
        "startAt": "2022-09-03T00:00:00",
        "endAt": "2022-09-03T02:00:00",
        "title": "Pomalý přesun do lesa",
        "description": "",
        "_top": "13%"
      },
      {
        "id": "ev36a",
        "lineup": "liorg",
        "startAt": "2022-09-03T02:00:00",
        "endAt": "2022-09-03T08:00:00",
        "title": "Noční klid :) a jakékoliv noční pokračování v lese",
        "_top": "29%"
      },
      {
        "id": "ev37",
        "lineup": "liorg",
        "startAt": "2022-09-03T08:00:00",
        "endAt": "2022-09-03T10:00:00",
        "title": "Čas si dát kafe, snídani, ranní sprchu, výběh",
        "_top": "24%"
      },
      {
        "id": "ev38",
        "lineup": "liorg",
        "startAt": "2022-09-03T10:00:00",
        "endAt": "2022-09-03T11:00:00",
        "title": "Ofiko zahájení dne - nabídka, zda má někdo něco dalšího do programu",
        "_top": "12%"
      },
      {
        "id": "ev39",
        "lineup": "limain",
        "startAt": "2022-09-03T10:00:00",
        "endAt": "2022-09-03T12:00:00",
        "title": "Netradiční koníčky",
        "description": "potápění, létání (Havry)\nOkruhy (Michal)\nVideo-stroies - Tom + Mišo",
        "level": 110,
        "type": "topic"
      },
      {
        "id": "ev40",
        "lineup": "libase",
        "startAt": "2022-09-03T10:00:00",
        "endAt": "2022-09-03T12:00:00",
        "title": "Sustainable code",
        "_top": "22%",
        "level": 110
      },
      {
        "id": "ev41",
        "lineup": "liother",
        "startAt": "2022-09-03T10:00:00",
        "endAt": "2022-09-03T12:00:00",
        "title": "Poriadok v hlave s Poldem",
        "level": 110,
        "_top": "22%"
      },
      {
        "id":"ev42",
        "lineup": "liorg",
        "startAt": "2022-09-03T12:00:00",
        "endAt": "2022-09-03T14:00:00",
        "title": "Ideální doba se nadlábnout",
        "_top": "39%"
      },
      {
        "id": "ev43",
        "lineup": "liorg",
        "startAt": "2022-09-03T14:00:00",
        "endAt": "2022-09-03T16:00:00",
        "title": "Sejdeme se v mainfraime, program na další dvě hodniky + nové věci",
        "_top": "36%"
      },
      {
        "id": "ev44",
        "lineup": "limain",
        "startAt": "2022-09-03T14:00:00",
        "endAt": "2022-09-03T16:00:00",
        "title": "Bio-hacking / life hacking",
        "description": "Preperství a cestování (Míla F.)\nAlexythimie",
        "level": 110
      },
      {
        "id": "ev45",
        "lineup": "libase",
        "startAt": "2022-09-03T14:00:00",
        "endAt": "2022-09-03T16:00:00",
        "title": "BI + Data",
        "description": "\n",
        "level": 110
      },
      {
        "id": "ev46",
        "lineup": "liother",
        "startAt": "2022-09-03T14:00:00",
        "endAt": "2022-09-03T16:00:00",
        "title": "Mastermind skupina s Daliborem",
        "level": 110,
        "_top": "28%"
      }
    ]
  );
}
