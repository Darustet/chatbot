import axios from "axios";
import express from "express";
import 'dotenv/config';
import * as cheerio from "cheerio";
import adminRoutes from "./routes/admin.js";
import chatbotRoutes from "./routes/chatbot.js";
import thesesRoutes from "./routes/theses.js";
import { validUniCodes } from "./config/universities.js";

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
app.use("/theses", thesesRoutes);

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
    console.log("📚 Theses API (DB) available at /theses/uni/:uni");
    console.log("🏥 Health check available at /health");
});