import axios from "axios";
import express from "express";
import * as cheerio from "cheerio";
import adminRoutes from "./routes/admin.js";
import chatbotRoutes from "./routes/chatbot.js";

const app = express();

// Add JSON body parser middleware
app.use(express.json());

// Link for theseus.fi
const baseLink = "https://www.theseus.fi/";
const link = "https://www.theseus.fi/discover?scope=10024%2F6&query=+nokia&rpp=30";
const aaltoApiBase = "https://aaltodoc.aalto.fi/server/api";
const aaltoBachelorEndpoint = "4e50a35c-f00f-49ae-93b2-3223353681ec"; // size=20 is the default
const aaltoMasterEndpoint = "663a76cb-af53-4943-a224-19e055302c24";

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
  {"uni": "Aalto", "code": "AALTO"}
];

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
    const test = req.params.uni;
    const query = String(req.query.query || "nokia");
    // Results per page, capped at 100, default 30
    console.log('rpp la: ', req.query.rpp);
    const rpp = Math.min(parseInt(String(req.query.rpp || "30"), 10) || 30, 100);
    console.log('rpp la: ', rpp);
    // Minimum year filter, default 2023
    const yearMin = parseInt(String(req.query.yearMin || "2023"), 10) || 2023;
    // Current year for filtering
    const d = new Date();
    const yearNow = d.getFullYear();
    
    console.log(`Received request for university: ${test} (query=${query}, rpp=${rpp}, yearMin=${yearMin})`);

    try {
        // Build the proper URL for theseus.fi / Aalto
        const encodedQuery = encodeURIComponent(query);
        let fetchUrl;
        
        if (test === "AALTO") {
            // Aalto DSpace API with date filtering in the URL
            // encode date issued filter
            const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearNow}]`);

            // Use bachelor endpoint for now
            fetchUrl = `${aaltoApiBase}/discover/search/objects?scope=${aaltoBachelorEndpoint}&query=${encodedQuery}&configuration=default&size=${rpp}&f.dateIssued=${encodedDateFilter},equals`;
            console.log("fetchUrl: ", fetchUrl);
        } else if (test === "all") {
            fetchUrl = `${baseLink}discover?scope=10024%2F6&query=+${encodedQuery}&rpp=${rpp}`;
        } else {
            fetchUrl = `${baseLink}discover?scope=${test}&query=+${encodedQuery}&rpp=${rpp}`;
        }
        
        console.log("Fetching from:", fetchUrl);
        // Fetch the HTML
        const response = await axios.get(fetchUrl, { 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000 
        });
        console.log("Response status:", response.status);
        
        // Parse the HTML
        const $ = cheerio.load(response.data);
        console.log("HTML loaded, searching for thesis data...");
        const thesesData = [];

        if (req.params.uni === "AALTO") {
            // Aalto DSpace API response parsing
            console.log(response.data._embedded.searchResult);
           
            // Extract data from each object
            const objects = response.data._embedded.searchResult._embedded.objects;
            objects.forEach((obj, index) => {
                try {
                    const item = obj._embedded.indexableObject;
                    const thesisId = item.id || `unknown-id-${index}`;
                    const title = item.name || "No Title";
                    const handle = item.handle ? `/handle/${item.handle}` : "";
                    const authorArr = item.metadata['dc.contributor.author'] || [];
                    const author = authorArr.length > 0 ? authorArr[0].value : "Unknown Author";
                    const dateIssuedArr = item.metadata['dc.date.issued'] || [];
                    const year = dateIssuedArr.length > 0 ? dateIssuedArr[0].value : "Unknown Date";
                    const publisherArr = item.metadata['dc.contributor'] || [];
                    let publisher = "Unknown University";
                    const universityCode = "AALTO";
                    if (publisherArr.length > 0) {
                        // Try to find English name first
                        const engPub = publisherArr.find(p => p.language === 'en');
                        if (engPub) {
                            publisher = engPub.value;
                        } else {
                            publisher = publisherArr[0].value;
                        }
                    }
                    // Add thesis to the list
                    thesesData.push({
                        handle,
                        thesis: {
                            thesisId,
                            title,
                            author,
                            year,
                            publisher,
                            universityCode: universityCode
                        }
                    });
                    console.log(`Added Aalto thesis #${thesesData.length}: "${title}" by "${author}" from "${publisher}"`);
                } catch (error) {
                    console.error(`Error parsing Aalto thesis item ${index}:`, error);
                }
            });
        } else {
            // Improved extraction logic
            $('.artifact-description').each((index, element) => {
                try {
                    // Extract title
                    const title = $(element).find('h4').text().trim();
                    
                    // Extract handle/URL
                    const handle = $(element).find('a').first().attr('href') || "";
                    
                    // Extract author
                    let author = "";
                    const authorElem = $(element).find('.author, span:contains("Author")');
                    if (authorElem.length) {
                        author = authorElem.text().replace(/Author:?\s*/i, '').trim();
                    } else {
                        const text = $(element).text();
                        const authorMatch = text.match(/Author:\s*([^,;\n]+)/i);
                        if (authorMatch && authorMatch[1]) {
                            author = authorMatch[1].trim();
                        }
                    }
                    
                    // Extract university/publisher
                    let publisher = "";
                    const publisherElem = $(element).find('.publisher, span:contains("Publisher")');
                    if (publisherElem.length) {
                        publisher = publisherElem.text().replace(/Publisher:?\s*/i, '').trim();
                    } else {
                        const text = $(element).text();
                        const publisherMatch = text.match(/Publisher:\s*([^,;\n]+)/i);
                        if (publisherMatch && publisherMatch[1]) {
                            publisher = publisherMatch[1].trim();
                        } else {
                            // Fallback: Use the university code to map to a university name
                            if (test === "all") {
                                // For "all" case, publisher might be detected elsewhere in the element
                                const fullText = $(element).text();
                                for (const uniData of uniCodes) {
                                    if (fullText.includes(uniData.uni)) {
                                        publisher = uniData.uni;
                                        break;
                                    }
                                }
                            } else {
                                // For specific university code
                                const uniMatch = uniCodes.find(u => u.code === test);
                                if (uniMatch) {
                                    publisher = uniMatch.uni;
                                }
                            }
                        }
                    }
                    
                    // Extract year
                    let year = "";
                    const yearElem = $(element).find('.date, span:contains("Date")');
                    if (yearElem.length) {
                        year = yearElem.text().replace(/Date:?\s*/i, '').trim();
                    } else {
                        const text = $(element).text();
                        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
                        if (yearMatch) {
                            year = yearMatch[0];
                        }
                    }
                    
                    // Add thesis if we have a title
                    if (title) {
                        thesesData.push({
                            handle,
                            thesis: {
                                title,
                                author: author || "Unknown Author",
                                year: year || "Unknown Date",
                                publisher: publisher || "Unknown University",
                                universityCode: test
                            }
                        });
                        console.log(`Added thesis #${thesesData.length}: "${title}" by "${author}" from "${publisher}"`);
                    }
                } catch (error) {
                    console.error(`Error parsing thesis item ${index}:`, error);
                }
            });
        }
        
        
        console.log(`Found ${thesesData.length} real theses from theseus.fi`);
        
        // Filter theses to include only those published after 2022
        const filteredThesesData = thesesData.filter(thesis => {
            const year = parseInt(thesis.thesis.year, 10);
            return year > 2022;
        });
        
        console.log(`Filtered theses to include only those published after 2022: ${filteredThesesData.length} theses`);
        
        // Return filtered data or error
        if (filteredThesesData.length > 0) {
            console.log(`Sending ${filteredThesesData.length} theses to client`);
            return res.json(filteredThesesData);
        } else {
            console.error("No thesis data found for the selected university after filtering by year");
            return res.status(404).json({ error: "No thesis data found for the selected university after filtering by year" });
        }
    } catch (error) {
        console.error("Error fetching from theseus.fi:", error);
        return res.status(500).json({ error: "Failed to fetch data from theseus.fi" });
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