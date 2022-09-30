import createTriggers, { onPurgeStellate } from "../src/index.js";
import { sql } from "./db.js";

const { notifierKey } = await createTriggers(sql)();
console.log(notifierKey);

await sql.listen(notifierKey, (str) =>
  Promise.resolve(str)
    .then(JSON.parse)
    .then((v) => (console.log(v), v))
    .then(onPurgeStellate)
);
