import { handleDebug, pipe } from "./utils.js";
import { fetch } from "undici";

export default ({ url, token }) =>
  pipe(
    ({ key_fields, table, views, all }) => ({
      views,
      table,
      all,
      values: key_fields
        ?.map((d) =>
          Object.entries(d).map(([name, value]) => ({
            name,
            value,
          }))
        )
        ?.flat()
        ?.filter((v) => v),
    }),
    ({ table, values, views, all }) => [
      !all && values?.length > 0 && values?.[0]?.name !== "id"
        ? `_purgeType(soft: true, type: ${JSON.stringify(
            table
          )}, keyFields: ${JSON.stringify(values)
            .replace(/"name":/g, "name:")
            .replace(/"value":/g, "value:")})`
        : !all && values?.length > 0
        ? `purge${table}(soft: true, id: ${JSON.stringify(
            values.map(({ value }) => value)
          )})`
        : `purge${table}(soft: true)`,
      views.map((view_name) => `purge${view_name}(soft: true)`),
    ],
    (string) =>
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stellate-token": token,
        },
        body: JSON.stringify({
          query: `
          mutation {
            ${string}
          }
        `,
        }),
      })
        .then((r) => r.json())
        .catch(console.error),
    handleDebug.noopLog
  );
