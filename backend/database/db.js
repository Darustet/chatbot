import pg from "pg";

if (process.env.NODE_ENV !== "production") {
  const dotenv = await import("dotenv");
  dotenv.default.config({ path: new URL("../.env", import.meta.url) });
}

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

db.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

db.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

export default db;