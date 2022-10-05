import {
  handleDebug,
  pipe,
  throwErr,
  debounce,
  groupByArray,
  noopLog,
} from "../../utils.js";
import { fetch } from "undici";
import editStellateConfig from "./editStellateConfig.js";

export default ({ url, purge_token, user_token, service, org }) => ({
  onAlterPkStellate: () =>
    debounce(
      pipe(
        (arr) => Object.fromEntries(arr.map(({ table, pk }) => [table, pk])),
        (types) => ({ types }),
        handleDebug.noopLog,
        editStellateConfig({ user_token, org, service })
      )
    ),
  onPurgeStellate: ({ soft }) =>
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
          purge?.includes(table) &&
            (!all && values?.length > 0
              ? `purge${table}(soft: ${soft}, ${groupByArray(
                  values,
                  ({ name }) => name
                ).map(
                  ([name, values]) =>
                    `${name}: ${JSON.stringify(
                      values.map(({ value }) => value)
                    )}`
                )})`
              : `purge${table}(soft: ${soft})`),
          ...purge
            ?.filter((name) => name !== table)
            ?.map((view_name) => `purge${view_name}(soft: ${soft})`),
        ].filter((v) => v),
      (arr) => arr.join("\n"),
      handleDebug.noopLog,
      (string) =>
        !(string?.trim()?.length > 0)
          ? null
          : fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "stellate-token": purge_token,
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
              .then((v) => (console.log(v), v))
              .then((r) => (r.errors ? throwErr(r) : r))
              .catch(console.error),
      handleDebug.noopLog
    ),
});
