import { promisify } from "util";
import { exec } from "child_process";
import "dotenv/config";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { parse, stringify } from "yaml";

const configDir = join(".stellate");
const configPath = join(configDir, "stellate.yml");

const createFolder = (path) =>
  mkdir(path)
    .catch(() => undefined)
    .then(() => path);

const createRun =
  ({ STELLATE_TOKEN, STELLATE_ORG }) =>
  async (cmd) =>
    promisify(exec)(cmd, {
      cwd: await createFolder(configDir),
      env: { ...process.env, STELLATE_TOKEN, STELLATE_ORG },
    }).then((obj) => (console.log(...Object.entries(obj).flat()), obj));

const pullConfig =
  (run) =>
  ({ service }) =>
    run(`npx stellate pull --service ${service} --output-format yml`)
      .then(() => readFile(configPath))
      .then(String)
      .then(parse);

const pushConfig = (run) => (config) =>
  writeFile(configPath, stringify(config)).then(() => run(`npx stellate push`));

export default ({ user_token, org, service }) =>
  async ({ types }) => {
    const run = createRun({ STELLATE_ORG: org, STELLATE_TOKEN: user_token });
    const config = await pullConfig(run)({ service });
    await pushConfig(run)({
      ...config,
      mutationPolicy: "Type",
      keyFields: {
        types: {
          ...(config?.keyFields?.types ?? {}),
          ...Object.fromEntries(
            Object.entries(types).filter(([k, v]) => k && v?.length > 0)
          ),
        },
      },
    });
  };
