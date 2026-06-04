/**
 * API utilities for connecting to the backend
 */

// The base URL for the backend API with flexible configuration options
export const API_BASE_URL = getApiBaseUrl();

// Update the getApiBaseUrl function to automatically detect IP address
function getApiBaseUrl() {
  // Try multiple URLs in order of precedence
  const possibleUrls = [
    getStoredApiUrl(),        // 1. User-configured URL (if any)
    'http://localhost:5001',  // 2. Standard localhost
    'http://127.0.0.1:5001'   // 3. Alternative localhost
  ];
  
  // Use the first non-null URL
  for (const url of possibleUrls) {
    if (url) {
      console.log('Using backend URL:', url);
      return url;
    }
  }
  
  // Default fallback
  return 'http://127.0.0.1:5001';
}

// Helper function to get stored API URL
function getStoredApiUrl() {
  try {
    // For web environment
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('backend_api_url');
    }
    
    // For React Native environment
    // Note: In a full implementation, you would use AsyncStorage here,
    // but to keep it simple without adding dependencies, we're just using localStorage
    return null;
  } catch (error) {
    console.warn('Error accessing storage:', error);
    return null;
  }
}

// Update the setApiBaseUrl function to handle Expo/React Native environment
export function setApiBaseUrl(newUrl: string) {
  try {
    // Handle web environment
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('backend_api_url', newUrl);
      
      // Force reload to apply new API URL after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
    
    // Note: For React Native, you would use AsyncStorage here
    // But to keep it simple without adding dependencies, we're just using this
    console.log(`API URL updated to: ${newUrl}`);
    
    // Global variable update (will be lost on reload but useful for immediate use)
    (global as any).API_BASE_URL = newUrl;
  } catch (error) {
    console.error('Error saving API URL:', error);
  }
}

/**
 * API utilities for connecting to the admin backend
 */

// Add a separate base URL for admin endpoints that points to the Express server
export const ADMIN_API_BASE_URL = getAdminApiBaseUrl();

function getAdminApiBaseUrl() {
  // Try multiple URLs in order of precedence
  const possibleUrls = [
    getStoredAdminApiUrl(),     // 1. User-configured admin URL (if any)
    'http://localhost:3000',    // 2. Default Express server port
    'http://127.0.0.1:3000'     // 3. Alternative Express server address
  ];
  
  // Use the first non-null URL
  for (const url of possibleUrls) {
    if (url) {
      console.log('Using admin backend URL:', url);
      return url;
    }
  }
  
  // Default fallback
  return 'http://127.0.0.1:3000';
}

// Helper function to get stored admin API URL
function getStoredAdminApiUrl() {
  try {
    // For web environment
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('admin_backend_api_url');
    }
    return null;
  } catch (error) {
    console.warn('Error accessing storage:', error);
    return null;
  }
}

export function setAdminApiBaseUrl(newUrl: string) {
  try {
    // Handle web environment
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('admin_backend_api_url', newUrl);
      
      // Force reload to apply new API URL after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
    
    console.log(`Admin API URL updated to: ${newUrl}`);
    
    // Global variable update (will be lost on reload but useful for immediate use)
    (global as any).ADMIN_API_BASE_URL = newUrl;
  } catch (error) {
    console.error('Error saving admin API URL:', error);
  }
}

/**
 * Check if the backend server is available
 */
export async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/ping`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      timeout: 5000, // 5 second timeout
    });
    
    if (response.ok) {
      return { available: true, message: 'Backend server is available' };
    } else {
      return { available: false, message: `Backend server error: ${response.status}` };
    }
  } catch (error) {
    console.error('Backend connectivity error:', error);
    return { 
      available: false, 
      message: 'Cannot connect to backend server. Please ensure:',
      details: [
        '1. The server is running (python downloads.py)',
        '2. Server is accessible at: ' + API_BASE_URL,
        '3. You have installed all requirements (pip install -r requirements.txt)',
        `Error: ${error.message}`
      ]
    };
  }
}

/**
 * Fetch data from the API with proper error handling
 */
export async function fetchFromApi(endpoint: string, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    console.log(`From api.ts: Fetching from: ${url}`);
    
    // Add robust timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: controller.signal,
      ...options,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    const data = await response.json(); 
    console.log('from api.ts, response.json: ', data);
    return data;
  } catch (error) {
    console.error(`API error (${endpoint}):`, error);
    
    // Add better error messages for common issues
    if (error.message === 'Failed to fetch') {
      throw new Error('Could not connect to the backend server. Please check if the server is running.');
    }
    
    throw error;
  }
}

/**
 * Get a thesis summary with enhanced error handling and debugging
 */
export async function getThesisSummary(handle: string, universityCode: string, thesisId?: string) {
  // Check if handle is valid
  if (!handle || handle === 'undefined' || handle === 'null') {
    throw new Error('Invalid thesis handle');
  }

  console.log(`Making thesis summary request for: ${handle}`);
  
  try {
    console.log(`Making thesis summary request to ${API_BASE_URL} for university: ${universityCode}, handle: ${handle}, thesisId: ${thesisId}`);
    
    // Add timeout to prevent the request from hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Add debugging query parameter
    const debugQuery = `debug=true&t=${new Date().getTime()}`;
    
    // Don't automatically fall back to test endpoint - this masks real errors
    // and can make all summaries look the same
    const data = await fetchFromApi(
      `summary?key=${encodeURIComponent(handle)}&uni=${encodeURIComponent(universityCode)}&thesisId=${encodeURIComponent(thesisId || '')}&${debugQuery}`, 
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    // Enhanced debugging - log more details about the response
    console.log('---SUMMARY RESPONSE---');
    console.log('Status: Success');
    console.log('Summary present:', Boolean(data?.summary));
    console.log('Summary length:', data?.summary ? data.summary.length : 0);
    console.log('Summary type:', data?.summary ? typeof data.summary : 'N/A');
    console.log('Summary content:', data?.summary);
    console.log('Full response:', data);
    
    return data;
  } catch (error) {
    console.error('Error fetching thesis summary:', error);
    throw error; // Let the component handle fallbacks more explicitly
  }
}

/**
 * Get a test summary using the transformer model with test content
 */
export async function getTestSummary() {
  return fetchFromApi('test-summary');
}

/**
 * Force a hard-coded summary for testing frontend rendering
 * Use this to bypass the backend entirely
 */
export function getTestSummaryDirect() {
  const hardcodedSummary = {
    summary: `• This is a hardcoded test summary for frontend testing.
• It completely bypasses the backend server.
• If you can see this summary with bullet points, the frontend rendering works.`,
    model: "direct_hardcoded"
  };
  
  console.log("Returning direct hardcoded test summary:", hardcodedSummary);
  return Promise.resolve(hardcodedSummary);
}
