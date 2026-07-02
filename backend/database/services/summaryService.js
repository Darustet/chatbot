import { getSummaryByLink, createSummary } from '../repositories/summaryRepository.js';

const findSummaryByLink = async (link) => {
  return await getSummaryByLink(link);
};

const createSummaryEntry = async (link, summary) => {
  return await createSummary(link, summary);

}


export { findSummaryByLink, createSummaryEntry };