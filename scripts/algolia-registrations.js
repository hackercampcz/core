import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import createSearchClient from "https://esm.sh/algoliasearch@4.16.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

async function main({ adminToken }) {
  const client = createSearchClient("J77BFM3PLE", adminToken);
  const indexName = "hc-registrations";

  const resp = await client.multipleQueries([
    {
      indexName,
      query: "",
      params: {
        tagFilters: ["2023", "paid"],
        attributesToRetrieve: [],
        responseFields: ["nbHits"],
      },
    },
    {
      indexName,
      query: "",
      params: {
        tagFilters: ["2023", "invoiced"],
        attributesToRetrieve: [],
        responseFields: ["nbHits"],
      },
    },
    {
      indexName,
      query: "",
      params: {
        tagFilters: ["2023", "confirmed"],
        attributesToRetrieve: [],
        responseFields: ["nbHits"],
      },
    },
    {
      indexName,
      query: "",
      params: {
        tagFilters: ["2023", "waitingList"],
        attributesToRetrieve: [],
        responseFields: ["nbHits"],
      },
    },
  ]);

  const [paid, invoiced, confirmed, waitingList] = resp.results.map(
    (x) => x.nbHits,
  );

  console.log({ paid, invoiced, confirmed, waitingList });
}

await main(
  Object.assign(
    { adminToken: Deno.env.get("ALGOLIA_ADMIN_API_KEY") },
    parse(Deno.args),
  ),
);
