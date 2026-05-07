import axios from "axios";
import express from "express";
import "dotenv/config";
import * as cheerio from "cheerio";
import adminRoutes from "./routes/admin.js";
import chatbotRoutes from "./routes/chatbot.js";
import { getProvider } from "./providers/index.js";
import { calculateNokiaCollaborationScoreByRules } from "./utils/relevance.js";
import { deduplicate, resolveThesisLink } from "./providers/helpers.js";
import { uniCodes, validUniCodes } from "./config/universities.js";
import { createThesisEntry, findThesisByLink } from "./database/services/thesisService.js";
import { analyzeAbstract } from "./openAiDecision.js";

const app = express();

// Add JSON body parser middleware
app.use(express.json());

console.log('validUnicodes: ', validUniCodes);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

app.get("/uni/:uni", async (req, res) => {
    const uniCode = req.params.uni;
    const query = String(req.query.query || "nokia");
    // Results per page, capped at 200, default 30
    const rpp = Math.min(parseInt(String(req.query.rpp || "30"), 10) || 30, 200);
    console.log('Received query parameters:', { query, rpp, uniCode });
    console.log('rpp: ', rpp);
    // Minimum year filter, default 2023
    const yearMin = parseInt(String(req.query.yearMin || "2023"), 10) || 2023;
    // Maximum year filter, default current year
    const yearMax = parseInt(String(req.query.yearMax || String(new Date().getFullYear())), 10) || new Date().getFullYear();

    console.log(`Received request for university: ${uniCode} (query=${query}, rpp=${rpp}, yearMin=${yearMin}, yearMax=${yearMax})`);

    // Build context for provider functions
    const context = { uniCode, query, rpp, yearMin, yearMax, uniCodes };
    const provider = getProvider(uniCode);
    const isKnownUni = validUniCodes.includes(encodeURIComponent(uniCode));
    if (!isKnownUni) {
        return res.status(400).json({ error: `Unknown university code: ${uniCode}` });
    }
    let parsed = [];
    try {
        if (provider.buildUrls) {
            const urls = provider.buildUrls(context);
            console.log(`Fetching data from Bachelor URL: ${urls[0]}`);
            console.log(`Fetching data from Master URL: ${urls[1]}`);
            const responses = await Promise.all(urls.map( url => axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000

            })));
            parsed = responses.flatMap(response => provider.parse(response));
        } else {
            const fetchUrl = provider.buildUrl(context);
            console.log(`Fetching data from URL: ${fetchUrl}`);
            const response = await axios.get(fetchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });
            console.log("Response status:", response.status);
            parsed = provider.parse(response);
        }

        const normalized = await Promise.resolve(provider.normalize(parsed, { ...context}));

        const deduplicated = deduplicate(normalized);

        const filtered = deduplicated.filter(t => {
            const year = parseInt(t.thesis.year, 10);
            return year >= yearMin && year <= yearMax;
        });
        if (filtered.length === 0) {
            console.warn(`No thesis data found for university ${uniCode} after filtering by year`);
            return res.status(404).json({ error: `No thesis data found for university ${uniCode} after filtering by year` });
        }

        console.log(`Sending ${filtered.length} theses to client for university ${uniCode}`);

        const thesesWithScores = filtered.map((t) => {
            const thesis = t.thesis || {};
            const link = thesis.link || resolveThesisLink(thesis.handle, thesis.universityCode);
            const thesisWithLink = { ...thesis, link };
            const scoreData = calculateNokiaCollaborationScoreByRules(thesisWithLink);
            return {
                thesis: thesisWithLink,
                _nokiaScore: scoreData._nokiaScore,
                _nokiaRelevance: scoreData._nokiaRelevance,
                _nokiaReasons: scoreData._nokiaReasons
            };
        });

        const thesesWithScoreSorted = thesesWithScores.sort(
          (a, b) => b._nokiaScore - a._nokiaScore
        );

        for (const item of thesesWithScoreSorted) {
          const thesis = item.thesis;

          const abstract = Object.values(thesis.abstractByLanguage || {})
            .join(" ")
            .toLowerCase();

      const existingThesis = await findThesisByLink(thesis.link);

      if (existingThesis) {
        console.log(
          `Thesis with link ${thesis.link} already exists in the database.`
        );

        item.openAI_decision = existingThesis.openAI_decision || "unknown";
        item.openAI_evidence = existingThesis.openAI_evidence || "unknown";

        continue;
      }

      const getOpenAIDecision = await analyzeAbstract(thesis.link, thesis.title, abstract);

      item.openAI_decision = getOpenAIDecision.decision || "unknown";
      item.openAI_evidence = getOpenAIDecision.evidence || "unknown";

      const ThesisToInsertDb = await createThesisEntry({
        title: thesis.title,
        author: thesis.author,
        year: thesis.year,
        university: thesis.publisher || "Unknown University",
        university_code: thesis.universityCode || uniCode,
        handle: thesis.handle,
        link: thesis.link,
        thesisId: thesis.thesisId || null,
        abstract_text: abstract,
        final_label_id: null,

        rule_label: item._nokiaRelevance,
        rule_score: item._nokiaScore,
        rule_reasons: item._nokiaReasons?.join("; ") || null,

        ml_label: null,
        ml_probability: null,
        hybrid_label: null,
        hybrid_reasons: null,

        openAI_decision: item.openAI_decision,
        openAI_evidence: item.openAI_evidence,
      });

      console.log("Successfully inserted thesis link:", ThesisToInsertDb.link);
    }

    return res.json(thesesWithScoreSorted);
  } catch (error) {
    console.error(`Error fetching or processing data for university ${uniCode}:`, error);

    return res.status(500).json({
      error: `Failed to fetch or process data for university ${uniCode}`,
    });
  }
});

app.get("/single-thesis/:handle", async (req, res) => {
    const handle = req.params.handle;
    console.log(`Received request for single thesis with handle: ${handle}`);
    
    try {
        // Construct the full URL to the thesis
        const fullThesisUrl = `https://www.theseus.fi${handle}`;
        console.log(`Attempting to fetch download link from: ${fullThesisUrl}`);
        
        // Fetch the HTML content of the thesis page
        const response = await axios.get(fullThesisUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        // Load the HTML into Cheerio
        const $ = cheerio.load(response.data);
        
        // Look for the download link
        let downloadLink = $('a[href*="bitstream"]').attr('href');
        
        if (downloadLink) {
            console.log(`Found download link: ${downloadLink}`);
            res.send(downloadLink);
        } else {
            console.warn("No download link found on the page");
            res.status(404).send("Download link not found");
        }
    } catch (error) {
        console.error("Error fetching download link:", error);
        res.status(500).send("Error fetching download link");
    }
});

// Add routes
app.use("/api/admin", adminRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Health check endpoint for the main server
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        services: {
            admin: 'available',
            chatbot: 'available',
            theses: 'available'
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.listen(3000, () => {
    console.log("🚀 Server is running on port 3000");
    console.log("📊 Admin panel available at /api/admin");
    console.log("🤖 Chatbot API available at /api/chatbot");
    console.log("🏥 Health check available at /health");
});