# Chatbot Integration Directive for ModularInteractiveDisplay

## Objective
Integrate a smart chatbot system into the project to assist users with queries about Finnish academic theses, dashboard data, and general project information, while keeping the current scraping, extraction, and backend logic intact.

---

## Integration Plan

### 1. Chatbot Scope & Features
- Answer questions about Finnish academic theses (e.g., search, summary, author, year, university).
- Provide help on using the dashboard and admin features.
- Respond to general project or data-related queries.
- Optionally, support natural language queries for thesis search.

### 2. Architecture & Placement
- **Frontend:** Add a chatbot UI component (e.g., floating button or chat window) in the React Native app (under `app/components/Chatbot.tsx`).
- **Backend:** Add a new route (e.g., `/api/chatbot`) to handle chatbot requests, which can use existing data, scraping logic, or connect to an external AI service (e.g., OpenAI, Azure, or a local model).
- **Data Flow:**
  - User interacts with chatbot UI.
  - Frontend sends user message to backend `/api/chatbot` endpoint.
  - Backend processes the message, queries data or external AI, and returns a response.
  - Frontend displays the chatbot's reply.

### 3. Implementation Steps
1. Design chatbot UI in the frontend (`app/components/Chatbot.tsx`).
2. Create backend API endpoint (`/api/chatbot`) in Express (`backend/server.js` or a new route file).
3. Integrate with data sources:
   - Use existing scraping/extraction logic for thesis-related queries.
   - Optionally, connect to an external AI service for general conversation.
4. Ensure security:
   - Sanitize user input.
   - Rate-limit requests if exposing to the public.
5. Testing:
   - Test chatbot with various queries (thesis, dashboard, help, etc.).
   - Ensure no disruption to existing scraping or admin features.

### 4. Best Practices
- Keep chatbot logic modular and isolated from core scraping/extraction code.
- Use environment variables for API keys or external service credentials.
- Document new endpoints and UI components.
- Ensure accessibility and mobile responsiveness for the chatbot UI.
- Log chatbot interactions for future improvement (respecting privacy).

---

## Next Steps
- Review and approve this directive.
- After approval, proceed with implementation as outlined above.
