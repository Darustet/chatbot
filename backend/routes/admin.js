import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { getProvider } from '../providers/index.js';
import { deduplicate } from '../providers/helpers.js';
import { calculateNokiaCollaborationScoreByRules } from '../utils/relevance.js';
import { createThesisEntry, listTheses } from '../database/services/thesisService.js';
import { uniCodes, validUniCodes } from '../config/universities.js';

const router = express.Router();

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardFilePath = path.join(__dirname, '../data/dashboard.json');

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

async function fetchScoredThesesByUniversity(context) {
  const provider = getProvider(context.uniCode);
  let parsed = [];

  if (provider.buildUrls) {
    const urls = provider.buildUrls(context);
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

  const filtered = deduplicated.filter((item) => parseInt(item.thesis?.year, 10) >= context.yearMin);

  if (filtered.length === 0) {
    console.warn(`No thesis data found after filtering by year`);
  }
  const thesesWithScores = filtered.map((item) => {
    const scored = calculateNokiaCollaborationScoreByRules(item.thesis);
    return {
      thesis: item.thesis,
      _nokiaScore: scored._nokiaScore,
      _nokiaRelevance: scored._nokiaRelevance,
      _nokiaReasons: scored._nokiaReasons,
    };
  });
  return thesesWithScores;
}

// GET dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const data = await fs.readFile(dashboardFilePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading dashboard data:', error);
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return default structure
      const defaultData = {
        education: {
          courses: 10,
          workshops: 5
        },
        research_development: {
          projects: 8,
          publications: 15
        },
        common_events: {
          conferences: 3,
          meetups: 7
        }
      };
      
      // Create directory if it doesn't exist
      try {
        await fs.mkdir(path.dirname(dashboardFilePath), { recursive: true });
        // Write default data to file
        await fs.writeFile(dashboardFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
        return res.json(defaultData);
      } catch (writeError) {
        console.error('Error creating default dashboard data:', writeError);
        return res.status(500).json({ message: 'Failed to initialize dashboard data' });
      }
    }
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// UPDATE dashboard data
router.put('/dashboard', async (req, res) => {
  try {
    console.log('Received PUT request to update dashboard data');
    console.log('Request body:', req.body);
    
    const data = req.body;
    
    // Validate input structure
    if (!data || typeof data !== 'object') {
      console.error('Invalid data format received');
      return res.status(400).json({ message: 'Invalid data format' });
    }

    // Simple validation for expected structure
    const requiredSections = ['education', 'research_development', 'common_events'];
    for (const section of requiredSections) {
      if (!data[section] || typeof data[section] !== 'object') {
        console.error(`Missing or invalid section: ${section}`);
        return res.status(400).json({ 
          message: `Missing or invalid section: ${section}` 
        });
      }
    }

    // Make sure directory exists
    await fs.mkdir(path.dirname(dashboardFilePath), { recursive: true });
    
    // Log file path
    console.log('Writing to file:', dashboardFilePath);
    
    // Write to file
    await fs.writeFile(
      dashboardFilePath, 
      JSON.stringify(data, null, 2),
      'utf8'
    );
    
    console.log('Dashboard data updated successfully');
    res.json({ message: 'Dashboard updated successfully' });
  } catch (error) {
    console.error('Error updating dashboard data:', error);
    res.status(500).json({ 
      message: 'Failed to update dashboard data',
      details: error.message 
    });
  }
});

router.post('/collect-theses', async (req, res) => {
  try {
    const uniCode = String(req.body?.uniCode || 'all');
    const query = String(req.body?.query || 'nokia');
    // Default rpp is 30 (capped at 200)
    const rpp = Math.min(parseInt(String(req.body?.rpp || '30'), 10) || 30, 200);
    const yearMin = parseInt(String(req.body?.yearMin || '2023'), 10) || 2023;
    const yearNow = new Date().getFullYear();
    console.log(`Got request body: uniCode: ${uniCode}, query: ${query}, rpp: ${rpp}, yearMin: ${yearMin}, yearNow: ${yearNow}`);

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
        const context = { uniCode: code, query, rpp, yearMin, yearNow, uniCodes };
        const thesesWithScores = await fetchScoredThesesByUniversity(context);

        uniSummary.fetched = thesesWithScores.length;
        processSummary.fetched += thesesWithScores.length;

        for (const item of thesesWithScores) {
          const thesis = item.thesis || {};
          const payload = {
            title: thesis.title,
            author: thesis.author,
            year: thesis.year,
            university: getUniversityNameByCode(code),
            universityCode: thesis.universityCode || null,
            handle: thesis.handle || null,
            thesisId: thesis.thesisId || null,
            abstractText: toStorageAbstract(thesis.abstractByLanguage),
            publisher: thesis.publisher || null,
            labelName: toStoredLabel(item._nokiaRelevance)
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
            createThesisEntry(payload);
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
