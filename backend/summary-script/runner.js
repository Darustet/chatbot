import { findAbstractByLink } from "../database/services/thesisService.js";

const link = process.argv[2];

try {
    const result = await findAbstractByLink(link);
    console.log(result ?? "");
} catch (error) {
    console.error(error);
    process.exit(1);
}