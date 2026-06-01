import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../database/config/db.js";
import { findAbstractByLink } from "../database/services/thesisService.js";

import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const pageUrl = process.argv[2];

async function main() {
  try {
    await connectDB();

    const abstract = await findAbstractByLink(pageUrl);

    if (abstract) {
      process.stdout.write(abstract);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();