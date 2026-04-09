import axios from "axios";
import express from "express";
import * as cheerio from "cheerio";
import "./database/db.js";
import adminRoutes from "./routes/admin.js";
import chatbotRoutes from "./routes/chatbot.js";
import { createThesisEntry } from "./database/services/thesisService.js";
import { getProvider } from "./providers/index.js";
import { calculateNokiaCollaborationScoreByRules } from "./utils/relevance.js";
import { deduplicate } from "./providers/helpers.js";

const app = express();

// Add JSON body parser middleware
app.use(express.json());

const uniCodes = [
  {"uni": "All", "code": "all"},
  {"uni": "Centria", "code": "10024%2F1900"},
  {"uni": "Diakonia", "code": "10024%2F1552"},
  {"uni": "Haaga-Helia", "code": "10024%2F431"},
  {"uni": "Hämeen", "code": "10024%2F1766"},
  {"uni": "Humanistinen", "code": "10024%2F2050"},
  {"uni": "Jyväskylä", "code": "10024%2F5"},
  {"uni": "Kaakkois-suomen", "code": "10024%2F12136"},
  {"uni": "Kajaani", "code": "10024%2F1967"},
  {"uni": "Karelia", "code": "10024%2F1620"},
  {"uni": "Kymenlaakson", "code": "10024%2F1493"},
  {"uni": "Lab", "code": "10024%2F266372"},
  {"uni": "Lahden", "code":"10024%2F10"},
  {"uni": "Lapin", "code": "10024%2F69720"},
  {"uni": "Laurea", "code": "10024%2F12"},
  {"uni": "Metropolia", "code": "10024%2F6"},
  {"uni": "Mikkelin", "code": "10024%2F2074"},
  {"uni": "Oulu", "code": "10024%2F2124"},
  {"uni": "Poliisi", "code": "10024%2F86551"},
  {"uni": "Saimaan", "code": "10024%2F1567"},
  {"uni": "Satakunnan", "code": "10024%2F14"},
  {"uni": "Savonia", "code": "10024%2F1476"},
  {"uni": "Seinäjoen", "code": "10024%2F1"},
  {"uni": "Tampere", "code": "10024%2F13"},
  {"uni": "Turun", "code": "10024%2F15"},
  {"uni":  "Vaasa", "code": "10024%2F1660"},
  {"uni": "Yrkeshögskolan Arcada", "code": "10024%2F4"},
  {"uni":  "Yrkeshögskolan Novia", "code": "10024%2F2188"},
  {"uni": "Aalto", "code": "AALTO"},
  {"uni": "Helsinki", "code": "HELDA"},
  {"uni": "Tampere university", "code": "TREPO"},
  {"uni": "OuluRepo", "code": "OULUREPO"},
];


const validUniCodes = uniCodes.map(u => u.code);
console.log('validUnicodes: ', validUniCodes);

const toStoredLabel = (relevance) => {
    if (relevance === "NOKIA_COLLABORATION") return "NOKIA_COLLABORATION";
    if (relevance === "AMBIGUOUS") return "AMBIGUOUS";
    return "NO_INDICATION_OF_COLLABORATION";
};

// pick the english abstract if available, otherwise pick the first available abstract, 
// and if it's an array join it into a string
const pickAbstractForStorage = (abstractByLanguage) => {
    if (!abstractByLanguage) return null;
    if (typeof abstractByLanguage === "string") return abstractByLanguage;
    if (Array.isArray(abstractByLanguage)) return abstractByLanguage.join(" ");
    if (typeof abstractByLanguage === "object") {
        if (abstractByLanguage.en) return String(abstractByLanguage.en);
        const firstKey = Object.keys(abstractByLanguage)[0];
        return firstKey ? String(abstractByLanguage[firstKey]) : null;
    }
    return null;
};

const persistTheses = (thesesWithScores) => {
    let saved = 0;
    let failed = 0;

    for (const item of thesesWithScores) {
        try {
            const thesis = item.thesis || {};
            createThesisEntry({
                title: thesis.title,
                author: thesis.author,
                year: thesis.year,
                university: thesis.universityCode || null,
                universityCode: thesis.universityCode || null,
                handle: thesis.handle || null,
                thesisId: thesis.thesisId || null,
                abstractText: pickAbstractForStorage(thesis.abstractByLanguage),
                publisher: thesis.publisher || null,
                language: "en",
                labelName: toStoredLabel(item._nokiaRelevance)
            });
            saved += 1;
        } catch (error) {
            failed += 1;
        }
    }

    return { saved, failed };
};

const fetchScoredThesesByUniversity = async (uniCode, context) => {
    const provider = getProvider(uniCode);
    let parsed = [];

    if (provider.buildUrls) {
        const urls = provider.buildUrls(context);
        console.log(`Fetching data from Bachelor URL: ${urls[0]}`);
        console.log(`Fetching data from Master URL: ${urls[1]}`);
        const responses = await Promise.all(urls.map((url) => axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        })));
        parsed = responses.flatMap((response) => provider.parse(response));
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

    const normalized = await Promise.resolve(provider.normalize(parsed, { ...context }));
    const deduplicated = deduplicate(normalized);
    const filtered = deduplicated.filter((t) => parseInt(t.thesis.year, 10) > 2022);

    return filtered.map((t) => {
        const scoreData = calculateNokiaCollaborationScoreByRules(t.thesis);
        return {
            thesis: t.thesis,
            _nokiaScore: scoreData._nokiaScore,
            _nokiaRelevance: scoreData._nokiaRelevance,
            _nokiaReasons: scoreData._nokiaReasons
        };
    });
};

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
    // Current year for filtering
    const d = new Date();
    const yearNow = d.getFullYear();

    console.log(`Received request for university: ${uniCode} (query=${query}, rpp=${rpp}, yearMin=${yearMin}, yearNow=${yearNow})`);

    const isKnownUni = validUniCodes.includes(encodeURIComponent(uniCode));
    if (!isKnownUni) {
        return res.status(400).json({ error: `Unknown university code: ${uniCode}` });
    }

    try {
        let thesesWithScores = [];

        if (uniCode === "all") {
            const codesToFetch = uniCodes
                .map((u) => u.code)
                .filter((code) => code !== "all");

            for (const code of codesToFetch) {
                const context = { uniCode: code, query, rpp, yearMin, yearNow, uniCodes };
                try {
                    const scored = await fetchScoredThesesByUniversity(code, context);
                    thesesWithScores.push(...scored);
                } catch (error) {
                    console.error(`Failed to fetch theses for ${code}:`, error.message);
                }
            }
        } else {
            const context = { uniCode, query, rpp, yearMin, yearNow, uniCodes };
            thesesWithScores = await fetchScoredThesesByUniversity(uniCode, context);
        }

        if (thesesWithScores.length === 0) {
            console.warn(`No thesis data found for university ${uniCode} after filtering by year`);
            return res.status(404).json({ error: `No thesis data found for university ${uniCode} after filtering by year` });
        }

        const persisted = persistTheses(thesesWithScores);
        console.log(`Persisted theses for ${uniCode}: saved=${persisted.saved}, failed=${persisted.failed}`);
        console.log(`Sending ${thesesWithScores.length} theses to client for university ${uniCode}`);

        const thesesWithScoreSorted = thesesWithScores.sort((a, b) => b._nokiaScore - a._nokiaScore);

        return res.json(thesesWithScoreSorted);
    } catch (error) {
        console.error(`Error fetching or processing data for university ${uniCode}:`, error);
        return res.status(500).json({ error: `Failed to fetch or process data for university ${uniCode}` });
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