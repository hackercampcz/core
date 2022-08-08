import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";
import { accepted, internalError, readPayload, seeOther } from "../http.mjs";
import { postChatMessage } from "../slack.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});

function saveAttendee(dynamo, data) {
  return dynamo.send(
    new UpdateItemCommand({
      TableName: "hc-attendees",
      Key: marshall(selectKeys(data, new Set(["year", "slackID"]))),
      UpdateExpression:
        "SET housing = :housing, housingPlacement = :housingPlacement",
      ExpressionAttributeValues: marshall(
        {
          ":housing": data.housing,
          ":housingPlacement": data.housingPlacement,
        },
        { removeUndefinedValues: true }
      ),
    })
  );
}

function sendSlackMessage(submittedBy, item) {
  console.log({ event: "Sending Slack message", submittedBy, item });
  const message =
    submittedBy === item.slackID
      ? `Super! Právě sis vybral svoje ubytko na Campu.
Držíme Ti místo v ${item.housing} ${item.housingPlacement}, jak sis přál.

Potřebuješ to změnit? Stačí si [upravit ve svém profilu](https://donut.hackercamp.cz/), ale pozor, jen do 15.8!
Pak už to půjde jen po osobní domluvě s Pájou.

Vidíme se v září na Sobeňáku,

Tvoje Hacker Camp Crew`
      : `Gratulujeme, milý hackere,

Právě ti někdo zamluvil ubytko na Campu. Tvoje poděkování si zaslouží <@${submittedBy}>.
Takže teď Ti držíme místo v ${item.housing} ${item.housingPlacement}.
Chceš si zkontrolovat, co to znamená? Koukni na svůj profil s ubytkem.

Máš bydlení bez práce! Super. Užij si ušetřené minuty na fajn relax, nebo milá slova tomu, kdo Ti pomohl :)

Potřebuješ to změnit? Stačí si [upravit ve svém profilu](https://donut.hackercamp.cz/), ale pozor, jen do 15.8!
Pak už to půjde jen po osobní domluvě s Pájou.

Vidíme se v září na Sobeňáku,

Tvoje Hacker Camp Crew`;
  return postChatMessage(item.slackID, message);
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  try {
    const data = readPayload(event);
    const token = getToken(event.headers);
    const payload = await validateToken(token, process.env.private_key);
    const submittedBy = payload["https://slack.com/user_id"];
    const year = parseInt(data.year, 10);
    console.log({ method: "POST", data });
    for (const item of data.items) {
      await saveAttendee(dynamo, Object.assign({ year }, item));
      await sendSlackMessage(submittedBy, item);
    }
    if (event.headers.Accept === "application/json") {
      return accepted();
    }
    return seeOther();
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
