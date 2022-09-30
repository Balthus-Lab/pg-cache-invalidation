# pg-cache-invalidation

## Usage

```js
import createTriggers, { onPurgeStellate } from "pg-cache-invalidation";
import { sql } from "./db.js";

const { notifierKey } = await createTriggers(sql)();

await sql.listen(notifierKey, (str) =>
  Promise.resolve(str)
    .then(JSON.parse)
    .then((v) => (console.log(v), v))
    .then(onPurgeStellate)
);
```
