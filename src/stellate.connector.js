import { handleDebug, noopLog, pipe, throwErr } from "./utils.js";
import { fetch } from "undici";

export default ({ url, token, soft }) =>
  pipe(
    ({ key_fields, table, purge, all }) => ({
      purge,
      table,
      all,
      soft: Boolean(soft),
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
    ({ table, values, purge, all, soft }) =>
      [
        purge.includes(table) &&
          (!all && values?.length > 0 && values?.[0]?.name !== "id"
            ? `_purgeType(soft: ${soft}, type: ${JSON.stringify(
                table
              )}, keyFields: ${JSON.stringify(values)
                .replace(/"name":/g, "name:")
                .replace(/"value":/g, "value:")})`
            : !all && values?.length > 0
            ? `purge${table}(soft: ${soft}, id: ${JSON.stringify(
                values.map(({ value }) => value)
              )})`
            : `purge${table}(soft: ${soft})`),
        ...purge
          ?.filter((name) => name !== table)
          ?.map((view_name) => `purge${view_name}(soft: ${soft})`),
      ].filter((v) => v),
    (arr) => arr.join("\n"),
    handleDebug.noopLog,
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
        .then((r) => (r.errors ? throwErr(r) : r))
        .catch(console.error),
    handleDebug.noopLog
  );
