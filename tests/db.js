import "dotenv/config";
import postgres from "postgres";

export const dbConfig = {
  port: process.env.PSQL_PORT,
  user: process.env.PSQL_USER,
  host: process.env.PSQL_HOST,
  password: process.env.PSQL_PASSWORD,
  database: process.env.PSQL_DATABASE,
};

export const sql = postgres(dbConfig, { debug: true });
