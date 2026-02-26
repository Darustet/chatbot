import { AaltoProvider } from "./aalto.js";
import { TheseusProvider } from "./theseus.js";

/**
 * Provider map to associate university codes with their respective providers.
 * This allows for easy retrieval of the correct provider based on the university code. 
 * If a university code does not have a specific provider, the TheseusProvider will be used as a default.
 * Example usage:
 * const provider = getProvider("AALTO"); // returns AaltoProvider
 * const provider = getProvider("10024%2F6"); // returns TheseusProvider (default)
 * 
 */
export const providerMap = {
  AALTO: AaltoProvider,
};

export function getProvider(uniCode) {
  return providerMap[uniCode] || TheseusProvider;
}
