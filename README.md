# pg-cache-invalidation

## Usage

```js
import "dotenv/config";
import createTriggers, { onPurgeStellate } from "pg-cache-invalidation";
import { sql } from "./db.js";

const { notifierKey } = await createTriggers(sql)();

await sql.listen(notifierKey, (str) =>
  Promise.resolve(str)
    .then(JSON.parse)
    .then((v) => (console.log(v), v))
    .then(
      onPurgeStellate({
        token: process.env.STELLATE_TOKEN,
        url: process.env.STELLATE_URL,
      })
    )
    .catch(console.error)
);

```
