import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { getProvider } from '../providers/index.js';
import { deduplicate, resolveThesisLink } from '../providers/helpers.js';
import { calculateNokiaCollaborationScoreByRules } from '../utils/relevance.js';
import { createThesisEntry, listTheses } from '../database/services/thesisService.js';
import { uniCodes, validUniCodes } from '../config/universities.js';

const router = express.Router();

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardFilePath = path.join(__dirname, '../data/dashboard.json');
// ML service configuration
const mlServiceBaseUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';
const mlHighThreshold = parseFloat(process.env.ML_HIGH_THRESHOLD || '0.5');
console.log(`ML high threshold: ${mlHighThreshold}`);
const mlLowThreshold = parseFloat(process.env.ML_LOW_THRESHOLD || '0.3');
console.log(`ML low threshold: ${mlLowThreshold}`);

const validUniCodeSet = new Set(validUniCodes); // an object of university codes
const getUniversityNameByCode = (code) => uniCodes.find((entry) => entry.code === code)?.uni || null;

const toStoredLabel = (relevance) => {
  if (relevance === 'NOKIA_COLLABORATION') return 'NOKIA_COLLABORATION';
  if (relevance === 'AMBIGUOUS') return 'AMBIGUOUS';
  return 'NO_INDICATION_OF_COLLABORATION';
};

// Get the english abstract for storage, otherwise pick the first available language. 
const toStorageAbstract = (abstractByLanguage) => {
  if (!abstractByLanguage) return null;
  if (typeof abstractByLanguage === 'string') return abstractByLanguage;
  if (Array.isArray(abstractByLanguage)) return abstractByLanguage.join(' ');
  if (typeof abstractByLanguage === 'object') {
    if (abstractByLanguage.en) return String(abstractByLanguage.en);
    const firstKey = Object.keys(abstractByLanguage)[0];
    return firstKey ? String(abstractByLanguage[firstKey]) : null;
  }
  return null;
};

const makeThesisKey = ({ handle, title, year, universityCode }) => {
  const handlePart = handle || '';
  const titlePart = title || '';
  const yearPart = year == null ? '' : String(year);
  const uniPart = universityCode || '';
  return `${handlePart}|${titlePart}|${yearPart}|${uniPart}`.toLowerCase();
};

// title and abstract combined for ML model input
const toModelText = (title, abstractText) => {
  const safeTitle = title ? String(title) : '';
  const safeAbstract = abstractText ? String(abstractText) : '';
  return `${safeTitle} ${safeAbstract}`.trim();
};

// Call ML service to classify thesis text, return null if any error occurs or if text is empty
async function classifyThesisWithMl(text) {
  if (!text) return null;
  try {
    const response = await axios.post(
      `${mlServiceBaseUrl}/classify-thesis`,
      { text },
      { timeout: 8000 }
    );
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const detail = error?.response?.data?.error || error?.message || error;
    console.warn(`ML classify call failed (status: ${status ?? 'n/a'}), fallback to rule-only:`, detail);
    return null;
  }
}

// Convert ML probability to label bands
const toMlBandLabel = (probability) => {
  if (typeof probability !== 'number' || Number.isNaN(probability)) return 'AMBIGUOUS';
  if (probability >= mlHighThreshold) return 'NOKIA_COLLABORATION';
  if (probability <= mlLowThreshold) return 'NO_INDICATION_OF_COLLABORATION';
  return 'AMBIGUOUS';
};

const decideHybridLabel = (ruleLabel, mlProbability) => {
  const normalizedRuleLabel = toStoredLabel(ruleLabel);
  const mlBandLabel = toMlBandLabel(mlProbability);

  // If ML is unavailable, keep current rule behavior.
  if (typeof mlProbability !== 'number' || Number.isNaN(mlProbability)) return normalizedRuleLabel;

  // If ML is uncertain, keep ambiguous for tie-break stage.
  if (mlBandLabel === 'AMBIGUOUS') return 'AMBIGUOUS';

  // If rule is uncertain but ML is confident, use ML.
  if (normalizedRuleLabel === 'AMBIGUOUS') return mlBandLabel;

  // If rule and ML disagree, mark as ambiguous for later LLM adjudication.
  if (normalizedRuleLabel !== mlBandLabel) return 'AMBIGUOUS';

  return normalizedRuleLabel;
};

async function fetchScoredThesesByUniversity(context) {
  const provider = getProvider(context.uniCode);
  let parsed = [];

  if (provider.buildUrls) {
    const urls = provider.buildUrls(context);
    console.log(`Fetching data from Bachelor URL: ${urls[0]}`);
    console.log(`Fetching data from Master URL: ${urls[1]}`);
    const responses = await Promise.all(
      urls.map((url) =>
        axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        })
      )
    );
    parsed = responses.flatMap((response) => provider.parse(response));
  } else {
    const url = provider.buildUrl(context);
    console.log(`Fetching data from Bachelor URL: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    parsed = provider.parse(response);
  }

  const normalized = await Promise.resolve(provider.normalize(parsed, { ...context }));

  const deduplicated = deduplicate(normalized);

  const filtered = deduplicated.filter((item) => {
    const year = parseInt(item.thesis?.year, 10);
    return year >= context.yearMin && year <= context.yearMax;
  });

  if (filtered.length === 0) {
    console.warn(`No thesis data found after filtering by year`);
  }
  const thesesWithScores = filtered.map((item) => {
    const thesis = item.thesis || {};
    const link = thesis.link || resolveThesisLink(thesis.handle, thesis.universityCode || context.uniCode);
    const thesisWithLink = { ...thesis, link };
    const scored = calculateNokiaCollaborationScoreByRules(thesisWithLink);
    return {
      thesis: thesisWithLink,
      _nokiaScore: scored._nokiaScore,
      _nokiaRelevance: scored._nokiaRelevance,
      _nokiaReasons: scored._nokiaReasons,
    };
  });
  return thesesWithScores;
}

router.post('/collect-theses', async (req, res) => {
  try {
    const uniCode = String(req.body?.uniCode || 'all');
    const query = String(req.body?.query || 'nokia');
    // Default rpp is 30 (capped at 200)
    const rpp = Math.min(parseInt(String(req.body?.rpp || '30'), 10) || 30, 200);
    const yearMin = parseInt(String(req.body?.yearMin || '2023'), 10) || 2023;
    const yearMax = parseInt(String(req.body?.yearMax || new Date().getFullYear()), 10) || new Date().getFullYear();
    console.log(`Got request body: uniCode: ${uniCode}, query: ${query}, rpp: ${rpp}, yearMin: ${yearMin}, yearMax: ${yearMax}`);

    if (!validUniCodeSet.has(uniCode)) {
      return res.status(400).json({ error: `Unknown university code: ${uniCode}` });
    }

    let targetCodes = [];
    if (uniCode === 'all') {
      targetCodes = uniCodes
        .map((u) => u.code)
        .filter((code) => code !== 'all');
    } else {
      targetCodes = [uniCode];
    }

    const existingRows = listTheses();
    console.log(`Existing theses in database: ${existingRows.length}`);
    const existingKeys = new Set(
      existingRows.map((row) =>
        makeThesisKey({
          handle: row.handle,
          title: row.title,
          year: row.year,
          universityCode: row.university_code
        })
      )
    );
    console.log("existing keys count: ", existingKeys.size);
    const runKeys = new Set();

    const processSummary = {
      requestedUniCode: uniCode,
      targets: targetCodes.length,
      fetched: 0,
      saved: 0,
      skipped: 0,
      failed: 0,
      byUniversity: {},
      startedAt: new Date().toISOString()
    };

    for (const code of targetCodes) {
      const uniSummary = { fetched: 0, saved: 0, skipped: 0, failed: 0 };
      processSummary.byUniversity[code] = uniSummary;

      try {
        const context = { uniCode: code, query, rpp, yearMin, yearMax, uniCodes };
        const thesesWithScores = await fetchScoredThesesByUniversity(context);

        uniSummary.fetched = thesesWithScores.length;
        processSummary.fetched += thesesWithScores.length;

        for (const item of thesesWithScores) {
          const thesis = item.thesis || {};
          const abstractText = toStorageAbstract(thesis.abstractByLanguage);
          const modelText = toModelText(thesis.title, abstractText);
          const mlResult = await classifyThesisWithMl(modelText);
          const mlProbability = typeof mlResult?.probability === 'number' ? mlResult.probability : null;
          const mlLabel = toMlBandLabel(mlProbability);
          const ruleLabel = toStoredLabel(item._nokiaRelevance);
          const hybridLabel = decideHybridLabel(item._nokiaRelevance, mlProbability);
          const finalLabelUsed = hybridLabel;

          const reasonParts = Array.isArray(item._nokiaReasons) ? [...item._nokiaReasons] : [];
          if (typeof mlProbability === 'number') {
            reasonParts.push(`ML probability: ${mlProbability.toFixed(3)}`);
          }
          reasonParts.push(`Hybrid label: ${hybridLabel}`);

          const payload = {
            title: thesis.title,
            author: thesis.author,
            year: thesis.year,
            university: getUniversityNameByCode(code),
            universityCode: thesis.universityCode || null,
            handle: thesis.handle || null,
            link: thesis.link || null,
            thesisId: thesis.thesisId || null,
            abstractText,
            rule_score: item._nokiaScore ?? null,
            rule_reasons: item._nokiaReasons ?? null,
            openAI_decision: finalLabelUsed,
            openAI_evidence: reasonParts.join("; ")
          };

          const thesisKey = makeThesisKey({
            thesisId: payload.thesisId,
            handle: payload.handle,
            title: payload.title,
            year: payload.year,
            universityCode: payload.universityCode
          });

          if (existingKeys.has(thesisKey) || runKeys.has(thesisKey)) {
            uniSummary.skipped += 1;
            processSummary.skipped += 1;
            continue;
          }

          try {
            await createThesisEntry(payload);
            existingKeys.add(thesisKey);
            runKeys.add(thesisKey);
            uniSummary.saved += 1;
            processSummary.saved += 1;
          } catch (error) {
            console.error(`Failed to save thesis for ${code}:`, error?.message || error);
            uniSummary.failed += 1;
            processSummary.failed += 1;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch/process theses for ${code}:`, error?.message || error);
        uniSummary.failed += 1;
        processSummary.failed += 1;
      }
    }

    processSummary.finishedAt = new Date().toISOString();
    return res.json(processSummary);
  } catch (error) {
    console.error('Error collecting theses:', error);
    return res.status(500).json({ error: 'Failed to collect theses' });
  }
});

export default router;
