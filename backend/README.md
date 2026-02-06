# Backend Setup Instructions

The backend server requires several Python packages to run correctly. Follow these steps to set up:

## Installation

1. Make sure you have Python 3.8 or newer installed
2. Install required packages:

```bash
pip install -r requirements.txt
```

## Important Dependencies

- **BeautifulSoup4**: Required for parsing HTML pages to find PDF downloads
- **Transformers**: Required for thesis summarization
- **PDFPlumber**: Required for extracting text from PDFs

## Running the Server

```bash
python downloads.py
```

The server will run on http://localhost:5000

## Finding Your Computer's IP Address

If you're accessing the application from a different device (like a mobile phone), you'll need to use your computer's actual IP address instead of 127.0.0.1 or localhost.

Run this helper script to find your IP address:

```bash
node discover_ip.js
```

Then in the application, when you see "Could not connect to the backend server" error:

1. Click "Configure Backend URL"
2. Enter the IP address shown by the script above, for example: http://192.168.1.100:5000
3. Click "Save & Apply"

## Troubleshooting Connection Issues

If you're getting "Could not connect to the backend server" errors:

1. **Ensure the backend is running**
   - Check if `python downloads.py` is still running in your terminal
   - Look for "Running on http://0.0.0.0:5000" message

2. **Use the correct IP address**
   - 127.0.0.1 or localhost only works when accessing from the same computer
   - Use your computer's actual IP address when accessing from another device
   - Use the discover_ip.js script to find your IP address

3. **Check for firewall issues**
   - Make sure your firewall isn't blocking connections to port 5000
   - Try temporarily disabling the firewall for testing

4. **Check network connectivity**
   - Make sure both devices are on the same network
   - Some public networks may block device-to-device communication

5. **Check error messages**
   - In the backend terminal, look for any error messages
   - On the frontend, use "Show Debug Info" to see connection details

## Troubleshooting Summary Generation

If summaries aren't appearing in the frontend:

1. **Use the test buttons**
   - Click "Load Test Summary" to verify basic connectivity
   - Click "Run Diagnostics" to check overall system health
   - Click "Force Display Summary" if data exists but isn't displayed

2. **Check model availability**
   - The "ping" endpoint will tell you if the summarizer model loaded
   - Look for model errors in the backend console
   - Try running `python -c "from transformers import pipeline; pipeline('summarization', model='facebook/bart-large-cnn')"` to test model loading

3. **Check memory usage**
   - The transformer models require significant RAM
   - If your system is running low on memory, models might fail to load or run

4. **Use the manual summary endpoint**
   - Try accessing `/manual-summary` directly in the browser
   - This bypasses the transformer model and PDF download
