import { AaltoProvider } from "./aalto.js";
import { TheseusProvider } from "./theseus.js";
import { HeldaProvider } from "./helda.js";
import {TrepoProvider} from "./trepo.js";
import { OuluRepoProvider } from "./oulurepo.js";
import { LutPubProvider } from "./lutpub.js";

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
  HELDA: HeldaProvider,
  TREPO: TrepoProvider,
  OULUREPO: OuluRepoProvider,
  LUTPUB: LutPubProvider,
};

export function getProvider(uniCode) {
  return providerMap[uniCode] || TheseusProvider;
}
