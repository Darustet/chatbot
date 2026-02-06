import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced conversation context with search results storage
const conversationContext = new Map();

// Enhanced response types
const RESPONSE_TYPES = {
  THESIS_SEARCH: 'thesis_search',
  THESIS_DETAILS: 'thesis_details',
  SHOW_MORE: 'show_more',
  SHOW_ALL: 'show_all',
  DASHBOARD_INFO: 'dashboard_info',
  PROJECT_INFO: 'project_info',
  GENERAL_HELP: 'general_help',
  UNIVERSITY_INFO: 'university_info',
  ADMIN_HELP: 'admin_help',
  GREETING: 'greeting',
  GRATITUDE: 'gratitude'
};

// University codes mapping
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
];

// Enhanced intent analysis
function analyzeIntent(message) {
  const lowerMessage = message.toLowerCase();
  
  // Greeting patterns
  if (lowerMessage.match(/^(hi|hello|hey)[\s!]*$/i)) {
    return RESPONSE_TYPES.GREETING;
  }
  
  // Gratitude patterns  
  if (lowerMessage.match(/^(thank you|thanks|thx)[\s!]*$/i)) {
    return RESPONSE_TYPES.GRATITUDE;
  }
  
  // Show more requests
  if (lowerMessage.includes('show more') || lowerMessage.includes('more theses') || 
      lowerMessage.includes('continue') || lowerMessage.includes('next')) {
    return RESPONSE_TYPES.SHOW_MORE;
  }
  
  // Show all requests
  if (lowerMessage.includes('show all') || lowerMessage.includes('all theses') || 
      lowerMessage.includes('complete list') || lowerMessage.includes('full list')) {
    return RESPONSE_TYPES.SHOW_ALL;
  }
  
  // Specific thesis details
  if (lowerMessage.includes('show me thesis') || 
      lowerMessage.includes('thesis number') ||
      lowerMessage.includes('more details about') ||
      lowerMessage.includes('tell me about thesis') ||
      /thesis \d+/i.test(lowerMessage)) {
    return RESPONSE_TYPES.THESIS_DETAILS;
  }
  
  // Thesis-related keywords
  if (lowerMessage.includes('thesis') || lowerMessage.includes('theses') || 
      lowerMessage.includes('research') || lowerMessage.includes('paper') ||
      lowerMessage.includes('search') || lowerMessage.includes('find') ||
      lowerMessage.includes('author') || lowerMessage.includes('university')) {
    return RESPONSE_TYPES.THESIS_SEARCH;
  }
  
  // Dashboard-related keywords
  if (lowerMessage.includes('dashboard') || lowerMessage.includes('statistics') ||
      lowerMessage.includes('data') || lowerMessage.includes('numbers') ||
      lowerMessage.includes('count') || lowerMessage.includes('education') ||
      lowerMessage.includes('research development') || lowerMessage.includes('events')) {
    return RESPONSE_TYPES.DASHBOARD_INFO;
  }
  
  // Admin-related keywords
  if (lowerMessage.includes('admin') || lowerMessage.includes('manage') ||
      lowerMessage.includes('update') || lowerMessage.includes('edit') ||
      lowerMessage.includes('configure') || lowerMessage.includes('backend')) {
    return RESPONSE_TYPES.ADMIN_HELP;
  }
  
  // University-specific keywords
  if (uniCodes.some(uni => lowerMessage.includes(uni.uni.toLowerCase())) ||
      lowerMessage.includes('metropolia') || lowerMessage.includes('nokia') ||
      lowerMessage.includes('collaboration')) {
    return RESPONSE_TYPES.UNIVERSITY_INFO;
  }
  
  // Project information keywords
  if (lowerMessage.includes('project') || lowerMessage.includes('app') ||
      lowerMessage.includes('how') || lowerMessage.includes('what') ||
      lowerMessage.includes('about') || lowerMessage.includes('stand')) {
    return RESPONSE_TYPES.PROJECT_INFO;
  }
  
  // Default to general help
  return RESPONSE_TYPES.GENERAL_HELP;
}

// Get dashboard data
async function getDashboardData() {
  try {
    const dashboardFilePath = path.join(__dirname, '../data/dashboard.json');
    const data = await fs.readFile(dashboardFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading dashboard data:', error);
    return null;
  }
}

async function searchFromHelda(query, limit = 30) {
  try {
    console.log("Searching from Helda with query: " + query)
    const serachUrl=`https://helda.helsinki.fi/server/api/discover/search/objects?query=dc.subject:${query}&scope=29bacde1-2a5b-4f5b-82f2-b925ce898000&size=${limit}`
    console.log("fetching from helda: ", serachUrl);
    const serverResponse = await axios.get(serachUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000
    });

    console.log("serverResponse from helda:", serverResponse.status);
    if (serverResponse.status === 200) {

      // Transform server data to match chatbot format (guard against unexpected structure)
      const objects = serverResponse.data?._embedded?.searchResult?._embedded?.objects;
      if (!Array.isArray(objects)) {
        console.warn('Unexpected Helda response structure, cannot find objects array');
        return [];
      }

      const transformedTheses = objects.flatMap((obj, index) => {
        const item = obj._embedded.indexableObject || obj;
        if (!item) return [];

        const title = item.name || item.metadata['dc.title'].value || 'Untitled Thesis';
        const author = item.metadata['dc.contributor.author'][0].value || 'Unknown Author';
        const year = item.metadata['dc.date.issued'][0].value || 'Unknown Year';
        const publisher = item.metadata['dc.publisher'][0].value || 'Unknown University';
        const id = item.id || '';
        const description = item.metadata['dc.description.abstract'][0].value || '';

        return {
          id: index + 1,
          title,
          author,
          year,
          publisher,
          handle: id,
          url: id ? `https://helda.helsinki.fi/server/api/core/items/${id}` : '',
          description
        };
      });
/*       const transformedTheses = objects.flatMap((obj, index) => ({
        const item = obj._embedded.indexableObject || obj

        id: index + 1,
        title: item.name || item.metadata['dc.title'].value || 'Untitled Thesis',
        author: item.metadata['dc.contributor.author'][0].value || 'Unknown Author',
        year: item.metadata['dc.date.issued'][0].value || 'Unknown Year',
        publisher: item.metadata['dc.publisher'][0].value || 'Unknown University',
        handle: item.id || '',
        url: id ? `https://helda.helsinki.fi/server/api/core/items/${id}` : '',
        description: item.metadata['dc.description.abstract'][0].value || ''
      }));  */
      
      console.log("Transformed theses from Helda, sample:", transformedTheses[0]);
      return transformedTheses;
    }

  } catch (error) {
    console.log("Error searching from Helda:", error);
  }
}

async function searchThesesFromFinna(query = "security", universityCode = "0/Helda/", limit = 30) {
  try {
    console.log(`Searching theses from Finna for query: "${query}", universityCode: "${universityCode}", limit: ${limit}`);
    const searchUrl =`https://api.finna.fi/api/v1/search?lookfor=${query}&type=AllFields&filter%5B%5D=building%3A${universityCode}&sort=relevance&page=1&limit=${limit}&prettyPrint=false`;
    console.log("fetching from finna: ", searchUrl);
    const serverResponse = await axios.get(searchUrl, {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000
    }); 

    console.log("serverResponse from finna:", serverResponse.data.status === 'OK', Array.isArray(serverResponse.data), serverResponse.data.resultCount);
    if (serverResponse.data.status === 'OK' && serverResponse.data.resultCount > 0) {
      console.log(`✅✅ Got ${serverResponse.data.resultCount} theses from Finna`);

      console.log("Server response data, index 0:", serverResponse.data.records ? serverResponse.data.records[0] : serverResponse.data[0]);
      // Transform server data to match chatbot format
      const transformedTheses = serverResponse.data.records.map((item, index) => ({
        id: index + 1,
        title: item.thesis?.title || item.title || 'Untitled Thesis',
        author: item.thesis?.author || item.nonPresenterAuthors[0].name || 'Unknown Author',
        year: item.thesis?.year || item.year || 'Unknown Year',
        publisher: item.buildings[0].translated || item.buildings.translated || 'Unknown University',
        handle: item.id || '',
        url: `https://finna.fi/Record/${item.id}`,
        description: item.thesis?.description || item.description || ''
      }));
      
      console.log("Transformed theses from Finna, sample:", transformedTheses[0]);
      return transformedTheses;
    }
    console.log("No theses found from Finna.");
    return [];
  } catch (error) {
    console.error('Error searching theses from Finna:', error);
    return [];
  }
}

// ENHANCED: Try to get theses from your existing server first, then fallback to external
async function searchTheses(query, universityCode, limit = 50) {
  console.log(`---TESTING--- Searching theses for query: "${query}", universityCode: "${universityCode}", limit: ${limit}`);
  try {
    // FIRST: Try to get data from your existing server
    console.log('Trying to fetch from existing server...');
    
    try {
      // Force external scraping for testing, change 3001 -> 3000 if you want to test your server
      const serverUrl = `http://localhost:3001/uni/${universityCode}?query=${encodeURIComponent(query)}&rpp=${limit}`;
      console.log(`Fetching from your server: ${serverUrl}`);
      
      const serverResponse = await axios.get(serverUrl, {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000
      });
      
      if (serverResponse.data && Array.isArray(serverResponse.data) && serverResponse.data.length > 0) {
        console.log(`✅ Got ${serverResponse.data.length} theses from your server`);
        
        // Transform server data to match chatbot format
        const transformedTheses = serverResponse.data.map((item, index) => ({
          id: index + 1,
          title: item.thesis?.title || item.title || 'Untitled Thesis',
          author: item.thesis?.author || item.author || 'Unknown Author',
          year: item.thesis?.year || item.year || 'Unknown Year',
          publisher: item.thesis?.publisher || item.publisher || 'Unknown University',
          handle: item.handle || '',
          url: item.handle ? `https://www.theseus.fi${item.handle}` : '',
          description: item.thesis?.description || item.description || ''
        }));
        
        console.log("Transformed theses from server, sample:", transformedTheses[0]);
        return transformedTheses;
      }
    } catch (serverError) {
      console.log('Server not available, falling back to external scraping...');
    }
    
    // FALLBACK: External scraping (your original logic but with higher limit)
    const baseLink = "https://www.theseus.fi/";
    const searchUrl = `${baseLink}discover?scope=${universityCode}&query=${encodeURIComponent(query)}&rpp=${limit}`;
    
    console.log(`External scraping from: ${searchUrl}`);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const theses = [];
    
    $('.artifact-description').each((index, element) => {
      const title = $(element).find('h4').text().trim();
      const author = $(element).find('.author').text().trim() || 
                   $(element).text().match(/Author:\s*([^,;\n]+)/i)?.[1]?.trim() || '';
      const handle = $(element).find('a').first().attr('href') || '';
      const year = $(element).text().match(/\b(19|20)\d{2}\b/)?.[0] || '';
      
      if (title) { // REMOVED: index < 6 limit
        theses.push({
          id: index + 1,
          title: title,
          author: author,
          year: year,
          handle: handle,
          url: handle ? `https://www.theseus.fi${handle}` : '',
          description: ''
        });
      }
    });
    
    console.log(`✅ Got ${theses.length} theses from external scraping`);
    return theses;
    
  } catch (error) {
    console.error('Error searching theses:', error);
    return [];
  }
}

// ENHANCED: Smart result formatting with pagination
function formatThesesResponse(theses, startIndex = 0, pageSize = 10, showAll = false) {
  if (!theses || theses.length === 0) {
    return {
      message: "No theses found matching your criteria.",
      hasMore: false,
      total: 0
    };
  }
  
  const total = theses.length;
  let displayTheses;
  let hasMore = false;
  
  if (showAll || total <= 15) {
    // Show all if requested or if small set
    displayTheses = theses;
  } else {
    // Paginate for larger sets
    displayTheses = theses.slice(startIndex, startIndex + pageSize);
    hasMore = (startIndex + pageSize) < total;
  }
  
  let response = `Great! I found **${total}** thesis${total > 1 ? 'es' : ''} matching your search! 📚\n\n`;
  
  if (displayTheses.length < total && !showAll) {
    response += `*Showing ${startIndex + 1}-${startIndex + displayTheses.length} of ${total} results:*\n\n`;
  }
  
  displayTheses.forEach((thesis, index) => {
    const actualIndex = startIndex + index + 1;
    response += `**${actualIndex}. ${thesis.title}**\n`;
    
    if (thesis.author) {
      response += `   👤 Author: ${thesis.author}\n`;
    }
    if (thesis.year) {
      response += `   📅 Year: ${thesis.year}\n`;
    }
    if (thesis.publisher) {
      response += `   🏫 University: ${thesis.publisher}\n`;
    }
    response += `\n`;
  });
  
  // Add navigation hints
  if (hasMore && !showAll) {
    response += `📋 **Options:**\n`;
    response += `• Say "show more theses" to see results ${startIndex + pageSize + 1}-${Math.min(startIndex + 2 * pageSize, total)}\n`;
    response += `• Say "show all theses" to see all ${total} results\n`;
    response += `• Say "show me thesis [number]" for detailed information\n\n`;
  }
  
  if (!hasMore && total > 10) {
    response += `✅ Showing all ${total} available theses!\n\n`;
  }
  
  response += `💡 **Tip**: Use the main app's thesis search to get AI summaries and QR codes!`;
  
  return {
    message: response,
    hasMore: hasMore,
    total: total
  };
}

// Generate responses based on intent
async function generateResponse(intent, message, context = {}) {
  switch (intent) {
    case RESPONSE_TYPES.GREETING:
      return "Hi there! 👋 I'm your Nokia Stand assistant. I can help you explore academic collaborations between Nokia and Finnish universities. What would you like to know?";
    
    case RESPONSE_TYPES.GRATITUDE:
      return "You're welcome! 😊 I'm happy to help. Is there anything else you'd like to explore?";
    
    case RESPONSE_TYPES.THESIS_SEARCH:
      return await handleEnhancedThesisSearch(message, context);
    
    case RESPONSE_TYPES.SHOW_MORE:
      return await handleShowMore(context);
    
    case RESPONSE_TYPES.SHOW_ALL:
      return await handleShowAll(context);
    
    case RESPONSE_TYPES.THESIS_DETAILS:
      return await handleThesisDetails(message, context);
    
    case RESPONSE_TYPES.DASHBOARD_INFO:
      return await handleDashboardInfo(message);
    
    case RESPONSE_TYPES.ADMIN_HELP:
      return handleAdminHelp(message);
    
    case RESPONSE_TYPES.UNIVERSITY_INFO:
      return handleUniversityInfo(message);
    
    case RESPONSE_TYPES.PROJECT_INFO:
      return handleProjectInfo(message);
    
    default:
      return handleGeneralHelp(message);
  }
}

// ENHANCED thesis search handler
async function handleEnhancedThesisSearch(message, context) {
  const lowerMessage = message.toLowerCase();
  
  // Check if user mentions specific university
  let universityCode = "all"; // Default to all
  const mentionedUni = uniCodes.find(uni => 
    lowerMessage.includes(uni.uni.toLowerCase())
  );
  if (mentionedUni) {
    universityCode = mentionedUni.code;
  }
  
  // Extract search terms
  let searchQuery = "tekoäly"; // Default search
  if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
    const searchMatch = message.match(/(?:search for|find)\s+(.+?)(?:\s+in|\s+at|$)/i);
    if (searchMatch) {
      searchQuery = searchMatch[1].trim();
    }
  }
  
  try {
    // Get ALL theses (removed limit)
    const allTheses = await searchTheses(searchQuery, universityCode, 50);
    console.log("--------- Get all thesis ----------- searchQuery:", searchQuery, "universityCode:", universityCode, "Found:", allTheses.length);
    const searchFinna = await searchThesesFromFinna(searchQuery, universityCode = "0/Helda/", 50);
    const searchHelda = await searchFromHelda(searchQuery, 50);

    console.log("--------- Finna theses ----------- Found:", searchFinna.length);
    try {
      allTheses.push(...searchFinna);
      // since we merged two sources, re-assign IDs
      allTheses.forEach((thesis, index) => {
        thesis.id = index + 1;
      });
    } catch (error) {
      console.log("Error pushing finna theses:", error);
    }

    console.log("--------- Helda theses ----------- Found:", searchHelda.length);
    try {
      allTheses.push(...searchHelda);
      // since we merged two sources, re-assign IDs
      allTheses.forEach((thesis, index) => {
        thesis.id = index + 1;
      });
    } catch (error) {
      console.log("Error pushing helda theses:", error);
    }

    console.log("--------- After Finna merge ----------- Total Found:", allTheses.length);
    
    if (allTheses.length === 0) {
      return `I couldn't find any theses matching "${searchQuery}" ${mentionedUni ? `at ${mentionedUni.uni}` : 'in the database'}. You might want to try different search terms or check if the thesis exists in our system.`;
    }
    
    // Store ALL results in context for pagination
    context.searchResults = allTheses;
    context.lastSearchQuery = searchQuery;
    context.lastUniversity = mentionedUni?.uni || 'all';
    context.currentPage = 0;
    
    // Format response with smart pagination
    const responseData = formatThesesResponse(allTheses, 0, 10, false);
    return responseData.message;
    
  } catch (error) {
    return "I'm having trouble searching for theses right now. Please make sure you're connected to the internet and try again.";
  }
}

// Handle "show more" requests
async function handleShowMore(context) {
  if (!context.searchResults || context.searchResults.length === 0) {
    return "I don't have any search results to show more of. Please search for theses first! 🔍";
  }
  
  const nextIndex = (context.currentPage + 1) * 10;
  
  if (nextIndex >= context.searchResults.length) {
    return `You've already seen all ${context.searchResults.length} theses! ✅\n\nTry a new search or ask for details about a specific thesis.`;
  }
  
  context.currentPage += 1;
  
  const responseData = formatThesesResponse(context.searchResults, nextIndex, 10, false);
  return responseData.message;
}

// Handle "show all" requests
async function handleShowAll(context) {
  if (!context.searchResults || context.searchResults.length === 0) {
    return "I don't have any search results to show. Please search for theses first! 🔍";
  }
  
  if (context.searchResults.length > 50) {
    return `That's a lot of theses (${context.searchResults.length})! 📚\n\nFor better readability, I recommend using "show more theses" to browse in smaller chunks, or try more specific search terms.`;
  }
  
  const responseData = formatThesesResponse(context.searchResults, 0, 0, true);
  return responseData.message;
}

// Handle specific thesis details
async function handleThesisDetails(message, context) {
  const thesisNumberMatch = message.match(/thesis\s+(\d+)/i) || 
                           message.match(/(\d+)/);
  
  if (!thesisNumberMatch) {
    return "Could you specify which thesis number you're interested in? For example, say \"show me thesis 3\".";
  }
  
  const thesisNumber = parseInt(thesisNumberMatch[1]);
  
  if (!context.searchResults || context.searchResults.length === 0) {
    return "I don't have any thesis search results. Please search for theses first!";
  }
  
  const thesis = context.searchResults.find(t => t.id === thesisNumber);
  
  if (!thesis) {
    return `I couldn't find thesis number ${thesisNumber}. Available theses are numbered 1-${context.searchResults.length}.`;
  }
  
  let response = `📋 **Detailed Information for Thesis #${thesis.id}**\n\n`;
  response += `**📖 Title:** ${thesis.title}\n\n`;
  
  if (thesis.author) {
    response += `**👤 Author:** ${thesis.author}\n\n`;
  }
  
  if (thesis.year) {
    response += `**📅 Year:** ${thesis.year}\n\n`;
  }
  
  if (thesis.publisher) {
    response += `**🏫 University:** ${thesis.publisher}\n\n`;
  }
  
  if (thesis.description) {
    response += `**📝 Description:** ${thesis.description}\n\n`;
  }
  
  if (thesis.handle) {
    response += `**🔗 Handle:** ${thesis.handle}\n\n`;
  }
  
  response += `**💡 What you can do:**\n`;
  response += `• Use the main app to get AI-generated summaries\n`;
  response += `• Generate QR codes for easy access\n`;
  response += `• Ask for "more Nokia theses" to see other research\n`;
  response += `• Search for similar topics or authors`;
  
  return response;
}

// Keep your existing handler functions exactly as they are
async function handleDashboardInfo(message) {
  const dashboardData = await getDashboardData();
  
  if (!dashboardData) {
    return "I'm unable to access the dashboard data at the moment. Please try again later.";
  }
  
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('education')) {
    const edu = dashboardData.education;
    return `Here's the education data from our dashboard:\n\n` +
           `• Innovation Projects: ${edu.innovation_projects || 'N/A'}\n` +
           `• Students: ${edu.students || 'N/A'}\n` +
           `• Trainees at Metropolia: ${edu.trainees_metropolia || 'N/A'}\n` +
           `• Trainees at Nokia: ${edu.trainees_nokia || 'N/A'}\n` +
           `• Total Credits: ${edu.credits || 'N/A'}\n` +
           `• Lectures/Presentations: ${edu.lectures || 'N/A'}`;
  }
  
  if (lowerMessage.includes('research') || lowerMessage.includes('development')) {
    const rd = dashboardData.research_development;
    return `Here's the R&D data from our dashboard:\n\n` +
           `• Completed Projects: ${rd.completed_projects || 'N/A'}\n` +
           `• Planned Projects: ${rd.planned_projects || 'N/A'}\n` +
           `• Test Network Cells: ${rd.test_network_cells || 'N/A'}\n` +
           `• Test Network Users: ${rd.test_network_users || 'N/A'}\n` +
           `• Common SECLE: ${rd.common_secle || 'N/A'}\n` +
           `• 6G SW Competence: ${rd.sw_competence || 'N/A'}`;
  }
  
  if (lowerMessage.includes('events')) {
    const events = dashboardData.common_events;
    return `Here's the events data from our dashboard:\n\n` +
           `• Hackathons: ${events.hackathons || 'N/A'}\n` +
           `• Recruitment Events: ${events.recruitment_events || 'N/A'}\n` +
           `• Site Visits to Nokia: ${events.visits_to_nokia || 'N/A'}\n` +
           `• Site Visits to Metropolia: ${events.visits_to_metropolia || 'N/A'}\n` +
           `• Nokia Staff: ${events.nokia_staff || 'N/A'}\n` +
           `• Metropolia Staff: ${events.metropolia_staff || 'N/A'}`;
  }
  
  // General dashboard overview
  return `Here's an overview of our dashboard data:\n\n` +
         `**Education:**\n` +
         `• Innovation Projects: ${dashboardData.education?.innovation_projects || 'N/A'}\n` +
         `• Students: ${dashboardData.education?.students || 'N/A'}\n` +
         `• Total Credits: ${dashboardData.education?.credits || 'N/A'}\n\n` +
         `**Research & Development:**\n` +
         `• Completed Projects: ${dashboardData.research_development?.completed_projects || 'N/A'}\n` +
         `• Planned Projects: ${dashboardData.research_development?.planned_projects || 'N/A'}\n\n` +
         `**Events:**\n` +
         `• Hackathons: ${dashboardData.common_events?.hackathons || 'N/A'}\n` +
         `• Recruitment Events: ${dashboardData.common_events?.recruitment_events || 'N/A'}\n\n` +
         `You can access the admin panel to update these values if you have the proper credentials.`;
}

function handleAdminHelp(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('password') || lowerMessage.includes('login')) {
    return "To access the admin panel:\n\n" +
           "1. Navigate to the admin section in the app\n" +
           "2. Use the password: **nokia123**\n" +
           "3. You'll be able to view and edit dashboard data\n\n" +
           "Note: In a production environment, this should be changed to a more secure password!";
  }
  
  if (lowerMessage.includes('update') || lowerMessage.includes('edit')) {
    return "To update dashboard data:\n\n" +
           "1. Access the admin panel with the password 'nokia123'\n" +
           "2. Edit the values you want to change\n" +
           "3. Click 'Save' to update the data\n" +
           "4. Use 'Reset' to revert to original values\n\n" +
           "You can also configure the backend URL if you're accessing from a different device.";
  }
  
  return "I can help you with admin-related tasks:\n\n" +
         "• **Access**: Use password 'nokia123' to log in\n" +
         "• **Update Data**: Edit dashboard values and save changes\n" +
         "• **Configure Backend**: Set up server connections\n" +
         "• **Manage System**: View and modify project statistics\n\n" +
         "What specific admin task would you like help with?";
}

function handleUniversityInfo(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('metropolia')) {
    return "**Metropolia University of Applied Sciences** is one of the key partners in this project:\n\n" +
           "• Primary focus on Nokia-related research and theses\n" +
           "• Students work on innovation projects with Nokia\n" +
           "• Offers traineeship programs at both Metropolia and Nokia\n" +
           "• Strong collaboration in R&D projects\n\n" +
           "You can search for Metropolia theses specifically using the thesis search feature.";
  }
  
  if (lowerMessage.includes('nokia')) {
    return "**Nokia's Role in this Project:**\n\n" +
           "• Collaborative partner with Finnish universities\n" +
           "• Provides internship and trainee opportunities\n" +
           "• Supports student research projects\n" +
           "• Focus areas: 5G/6G technology, software development, innovation\n" +
           "• Many academic theses are collaboration projects with Nokia\n\n" +
           "This platform showcases the academic work and collaboration between Nokia and Finnish universities.";
  }
  
  const availableUnis = uniCodes.slice(1, 27); // Show all universities
  return `I can help you find information about these Finnish universities:\n\n` +
         availableUnis.map(uni => `• ${uni.uni}`).join('\n') + '\n\n' +
         `**Key Partners:**\n` +
         `• **Metropolia** - Primary partner with extensive Nokia collaboration\n` +
         `• **Haaga-Helia** - Business and technology focus\n` +
         `• **Tampere** - Strong engineering programs\n\n` +
         `Each university contributes theses and research projects related to Nokia's work. You can search for specific university theses using the main search feature.`;
}

function handleProjectInfo(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('how') || lowerMessage.includes('work')) {
    return "**How the Nokia Stand Project Works:**\n\n" +
           "1. **Data Collection**: We access thesis data from your server and theseus.fi\n" +
           "2. **AI Processing**: Generate summaries of academic work using AI models\n" +
           "3. **Interactive Display**: Present ALL theses with search, filter, and QR code features\n" +
           "4. **Dashboard**: Show collaboration statistics and metrics\n" +
           "5. **Admin Panel**: Allow authorized users to manage data\n" +
           "6. **Enhanced Chatbot**: That's me! Now showing unlimited results\n\n" +
           "The goal is to showcase academic collaboration between Nokia and Finnish universities.";
  }
  
  if (lowerMessage.includes('feature')) {
    return "**Main Features:**\n\n" +
           "🔍 **Enhanced Thesis Search**: Find ALL academic theses, no limits!\n" +
           "🤖 **AI Summaries**: Automatically generated key points for each thesis\n" +
           "📱 **QR Codes**: Quick access to full thesis documents\n" +
           "📊 **Dashboard**: Statistics on education, R&D, and events\n" +
           "⚙️ **Admin Panel**: Manage data and system configuration\n" +
           "💬 **Smart Chatbot**: That's me! Now with unlimited thesis results\n" +
           "📄 **Pagination**: \"Show more\" and \"show all\" commands\n" +
           "🔍 **Detailed Views**: \"Show me thesis [number]\" for specific information\n\n" +
           "Which feature would you like to know more about?";
  }
  
  return "**Nokia Stand Project Overview:**\n\n" +
         "This is an enhanced interactive display application showcasing collaboration between Nokia and Finnish universities.\n\n" +
         "**Purpose**: Display ALL academic theses, research projects, and collaboration statistics\n" +
         "**Technology**: React Native frontend, Node.js/Python backend, AI-powered summaries\n" +
         "**Data Source**: Your thesis database + Theseus.fi (Finnish academic repository)\n" +
         "**New**: Unlimited thesis results with smart pagination!\n\n" +
         "The project demonstrates the strong partnership in education, research, and innovation between Nokia and Finnish academic institutions.";
}

function handleGeneralHelp(message) {
  return "Hello! I'm your enhanced Nokia Stand Assistant! 🚀\n\n" +
         "🔍 **Enhanced Thesis Search**: Find ALL available academic theses (no more limits!)\n" +
         "📊 **Dashboard Data**: View statistics on education, research, and events\n" +
         "⚙️ **Admin Tasks**: Help with system management and configuration\n" +
         "🏫 **University Info**: Learn about participating Finnish universities\n" +
         "💡 **Project Details**: Understand how this application works\n\n" +
         "**✨ New Commands:**\n" +
         "• \"Find Nokia theses\" - Shows ALL available results\n" +
         "• \"Show more theses\" - Continue to next page\n" +
         "• \"Show all theses\" - Display complete list\n" +
         "• \"Show me thesis 5\" - Get detailed information\n" +
         "• \"Show me dashboard statistics\"\n" +
         "• \"How do I access the admin panel?\"\n\n" +
         "Feel free to ask me anything related to Nokia and Finnish universities! 😊";
}

// Main chatbot endpoint with enhanced context
router.post('/', async (req, res) => {
  try {
    console.log('Received enhanced chatbot request:', req.body);
    
    const { message, context = {} } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string'
      });
    }
    
    const sessionId = context.sessionId || 'default';
    
    // Enhanced conversation context storage
    if (!conversationContext.has(sessionId)) {
      conversationContext.set(sessionId, {
        messages: [],
        searchResults: [],
        currentPage: 0,
        lastSearchQuery: '',
        lastUniversity: '',
        lastActivity: new Date()
      });
    }
    
    const userContext = conversationContext.get(sessionId);
    userContext.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    userContext.lastActivity = new Date();
    
    // Analyze intent and generate response
    const intent = analyzeIntent(message);
    console.log(`Detected intent: ${intent} for message: "${message}"`);
    
    const reply = await generateResponse(intent, message, userContext);
    
    // Store bot response in context
    userContext.messages.push({
      role: 'assistant',
      content: reply,
      timestamp: new Date()
    });
    
    // Clean up old conversations (keep only last 24 hours)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [key, value] of conversationContext.entries()) {
      if (value.lastActivity < cutoffTime) {
        conversationContext.delete(key);
      }
    }
    
    res.json({
      reply: reply,
      intent: intent,
      sessionId: sessionId,
      searchResultsAvailable: userContext.searchResults.length > 0,
      totalTheses: userContext.searchResults.length,
      currentPage: userContext.currentPage,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in enhanced chatbot endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      reply: 'I apologize, but I encountered an error while processing your request. Please try again.'
    });
  }
});

// Enhanced health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '2.0.0',
    features: {
      unlimited_thesis_results: true,
      smart_pagination: true,
      server_integration: true,
      detailed_thesis_info: true,
      enhanced_search: true
    },
    uptime: process.uptime(),
    activeConversations: conversationContext.size,
    timestamp: new Date().toISOString()
  });
});

export default router;