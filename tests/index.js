import "dotenv/config";
import createTriggers, { onPurgeStellate } from "../src/index.js";
import { sql } from "./db.js";

const {
  default: { default: untruncateJson },
} = await import("untruncate-json");
const { notifierKey } = await createTriggers(sql)();

await sql.listen(notifierKey, (str) =>
  Promise.resolve(str)
    .then(() => {
      try {
        return JSON.parse(str);
      } catch {
        return { ...JSON.parse(untruncateJson(str)), all: true };
      }
    })
    .then((v) => (console.log(v), v))
    .catch(console.error)
);
