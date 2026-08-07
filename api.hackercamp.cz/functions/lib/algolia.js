import { createFetchRequester } from "@algolia/requester-fetch";
import { liteClient } from "algoliasearch/lite";

export function createAlgoliaClient(env) {
  const requester = createFetchRequester();
  return liteClient(env.algolia_app_id, env.algolia_search_key, { requester });
}

export function resultsCount(indexName, year, tag) {
  return {
    indexName,
    query: "",
    tagFilters: [year.toString(), tag].filter(Boolean),
    attributesToRetrieve: [],
    responseFields: ["nbHits"]
  };
}
