export function resultsCount(indexName, year, tag) {
  return {
    indexName,
    query: "",
    params: {
      tagFilters: [year.toString(), tag],
      attributesToRetrieve: [],
      responseFields: ["nbHits"],
    },
  };
}
