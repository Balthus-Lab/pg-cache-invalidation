import "dotenv/config";
import pgInvalidation, { stellateConnector } from "../src/index.js";
import { sql } from "./db.js";
const { default: { default: untruncateJson } = {} } = await import(
  "untruncate-json"
);

const { notifierKey, pkNotifierKey, start } = await pgInvalidation(sql);
const { onPurgeStellate, onAlterPkStellate } = await stellateConnector({
  purge_token: process.env.STELLATE_PURGE_TOKEN,
  user_token: process.env.STELLATE_USER_TOKEN,
  org: process.env.STELLATE_ORG,
  url: process.env.STELLATE_URL,
  service: "ariane",
});

const parseJson = async (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return { ...JSON.parse(untruncateJson(str)), all: true };
  }
};

const onPk = onAlterPkStellate();
await sql.listen(
  pkNotifierKey,
  (str) => Promise.resolve(str).then(parseJson).then(onPk).catch(console.error),
  start
);

await sql.listen(notifierKey, (str) =>
  Promise.resolve(str)
    .then(parseJson)
    .then((v) => (console.log(v), v))
    .then(onPurgeStellate({ soft: true }))
    .catch(console.error)
);
