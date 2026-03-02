import pdfplumber
import os
import requests
import time
import urllib.parse
import re
import tempfile
from utils.summarizer import generate_thesis_points

try:
    from bs4 import BeautifulSoup
    bs4_available = True
except ImportError:
    bs4_available = False
    print("WARNING: BeautifulSoup4 not available. PDF link parsing may fail.")

THESEUS_BASE = "https://www.theseus.fi"
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'thesis_temp')
os.makedirs(TEMP_DIR, exist_ok=True)

HTTP_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# Download PDF from Theseus
def download_file(url):
    try:
        # if url is from "theseus.fi" and not start with http, prepend the base URL 
        if "theseus.fi" in url and not url.startswith("http"):
            url = 'https://www.theseus.fi' + url
        encoded_url = urllib.parse.quote(url, safe=":/?=&")
        print(f"Downloading from: {encoded_url}")
        thesis_id = hash(url) % 10000
        temp_file = os.path.join(TEMP_DIR, f"thesis_{thesis_id}.pdf")
        max_retries = 3
        session = requests.Session()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        for attempt in range(max_retries):
            try:
                response = session.get(encoded_url, headers=headers, stream=True, timeout=15)
                response.raise_for_status()
                content_type = response.headers.get('content-type', '').lower()
                if 'application/pdf' not in content_type:
                    print(f"Not a PDF, content-type: {content_type}. Trying to find PDF link...")
                    if 'text/html' in content_type:
                        if not bs4_available:
                            print("ERROR: Can't parse HTML without BeautifulSoup4. Please install with: pip install beautifulsoup4")
                            print("Attempting direct PDF URL construction as fallback...")
                            if '/handle/' in url:
                                handle_parts = url.split('/handle/')
                                if len(handle_parts) > 1:
                                    handle_id = handle_parts[1].split('/')[0].split('?')[0]
                                    direct_pdf_url = f"https://www.theseus.fi/bitstream/handle/{handle_id}/thesis.pdf"
                                    print(f"Trying constructed PDF URL: {direct_pdf_url}")
                                    try:
                                        pdf_response = session.get(direct_pdf_url, headers=headers, stream=True, timeout=15)
                                        pdf_response.raise_for_status()
                                        pdf_content_type = pdf_response.headers.get('content-type', '').lower()
                                        if 'application/pdf' in pdf_content_type:
                                            response = pdf_response
                                        else:
                                            raise Exception(f"Constructed URL is not a PDF: {pdf_content_type}")
                                    except Exception as e:
                                        print(f"Failed to get PDF from constructed URL: {e}")
                                        raise Exception("Could not find PDF using fallback method.")
                            else:
                                raise Exception("HTML parsing required but BeautifulSoup is not installed")
                        else:
                            soup = BeautifulSoup(response.text, 'html.parser')
                            pdf_link = None
                            for a in soup.find_all('a', href=True):
                                href = a['href']
                                if href.endswith('.pdf') or 'download' in href.lower() or 'bitstream' in href.lower():
                                    pdf_link = href
                                    if not pdf_link.startswith('http'):
                                        pdf_link = urllib.parse.urljoin(url, pdf_link)
                                    break
                            if pdf_link:
                                print(f"Found PDF link: {pdf_link}")
                                encoded_pdf_url = urllib.parse.quote(pdf_link, safe=":/?=&")
                                response = session.get(encoded_pdf_url, headers=headers, stream=True, timeout=15)
                                response.raise_for_status()
                                content_type = response.headers.get('content-type', '').lower()
                                if 'application/pdf' not in content_type:
                                    raise Exception(f"Found link is not a PDF: {content_type}")
                            else:
                                raise Exception("Could not find PDF link on the page")
                with open(temp_file, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                file_size = os.path.getsize(temp_file)
                print(f"Download completed. File size: {file_size} bytes")
                with open(temp_file, 'rb') as f:
                    if f.read(4) != b'%PDF':
                        raise Exception("File does not appear to be a valid PDF")
                return temp_file
            except (requests.RequestException, Exception) as e:
                print(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                    return None
    except Exception as e:
        print(f"Error in download_file: {e}")
        return None

# Extract text from PDF, trying to find abstract section, and return the text content of the abstract section. If abstract section is not found, return the text content of the first page.
def extract_text_from_pdf(pdf_path):
    try:
        if not pdf_path or not os.path.exists(pdf_path):
            print(f"PDF path does not exist: {pdf_path}")
            return ""
        
        with pdfplumber.open(pdf_path) as pdf:
            abstract_text = ""
            
            # Look for abstract in first 10 pages
            try:
                for page_num in range(min(10, len(pdf.pages))):
                    page = pdf.pages[page_num]
                    page_text = page.extract_text()
                    if not page_text:
                        continue
                    
                    if ("ABSTRACT" in page_text.upper() or
                        "abstract" in page_text.lower() or
                        "TIIVISTELMÄ" in page_text.upper()):
                        abstract_text = page_text
                        break
            except Exception as e:
                print(f"Error processing pages: {e}")
            
            # Fallback: use first two pages
            if not abstract_text and len(pdf.pages) >= 2:
                try:
                    abstract_text = pdf.pages[0].extract_text() + "\n" + pdf.pages[1].extract_text()
                except Exception as e:
                    print(f"Error extracting fallback text: {e}")
            
            # Final fallback: first page
            if len(pdf.pages) > 0 and not abstract_text:
                abstract_text = pdf.pages[0].extract_text()
            
            return abstract_text if abstract_text else ""
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

# Receive unstructured text that may contain the abstract sention and return the cleaned abstract text.
def extract_abstract_content(text):
    lines = text.split('\n')
    abstract_start = -1
    abstract_end = len(lines)

    # Find abstract header
    for i, line in enumerate(lines[:20]):
        if (re.match(r'^\s*ABSTRACT\s*$', line, re.IGNORECASE) or
            re.match(r'^\s*TIIVISTELMÄ\s*$', line, re.IGNORECASE) or
            re.search(r'^\s*Abstract[:\.]', line, re.IGNORECASE) or
            re.search(r'^\s*Tiivistelmä[:\.]', line, re.IGNORECASE)):
            abstract_start = i + 1
            print(f"Found abstract header at line {i}: '{line}'")
            break

    # Implicit start if no header
    if abstract_start == -1:
        print("No abstract header found. First 10 lines:")
        for i, line in enumerate(lines[:10]):
            print(f"Line {i}: '{line.strip()}'")
        for i, line in enumerate(lines):
            if (re.match(r'^\s*(author|degree|title|supervisor|instructor|date|pages|abstract)[\s:]', line.lower()) or
                len(line.strip()) < 40):
                continue
            if len(line.strip()) > 60:
                abstract_start = i
                print(f"Found implicit abstract start at line {i}: '{line[:50]}...'")
                break
            
    # Final fallback
    if abstract_start == -1:
        print("Using fallback abstract detection")
        abstract_start = 0
        while abstract_start < len(lines) and (
            not lines[abstract_start].strip() or
            re.match(r'^\s*(abstract|author|degree|title|supervisor|instructor|date|pages)[\s:]', lines[abstract_start].lower()) or
            len(lines[abstract_start].strip()) < 40
        ):
            abstract_start += 1
    for i in range(abstract_start, min(abstract_start + 30, len(lines))):
        if (re.match(r'^\s*keywords?\s*:?', lines[i].lower()) or
            re.match(r'^\s*introduction\s*$', lines[i].lower()) or
            re.match(r'^\s*1\.', lines[i]) or
            re.match(r'^\s*TABLE OF CONTENTS\s*$', lines[i].upper())):
            abstract_end = i
            print(f"Found abstract end at line {i}: '{lines[i]}'")
            break
    relevant_lines = lines[abstract_start:abstract_end]
    if len(relevant_lines) > 30:
        print(f"Limiting abstract from {len(relevant_lines)} lines to 20 lines")
        relevant_lines = relevant_lines[:20]
    result = []
    current_paragraph = []
    for line in relevant_lines:
        line = line.strip()
        if not line or re.match(r'^\s*(abstract|author|degree|title|supervisor|instructor|date|pages)[\s:]', line.lower()):
            if current_paragraph:
                result.append(' '.join(current_paragraph))
                current_paragraph = []
            continue
        current_paragraph.append(line)
    if current_paragraph:
        result.append(' '.join(current_paragraph))
    abstract_text = '\n\n'.join(result)
    abstract_text = re.sub(r'\s+', ' ', abstract_text).strip()
    print(f"Extracted abstract ({len(abstract_text)} chars): {abstract_text[:200]}...")
    return abstract_text


def cleanup_temp_files(max_age_hours=24):
    try:
        current_time = time.time()
        for filename in os.listdir(TEMP_DIR):
            file_path = os.path.join(TEMP_DIR, filename)
            if os.path.isfile(file_path) and (current_time - os.path.getmtime(file_path)) > (max_age_hours * 3600):
                os.remove(file_path)
                print(f"Removed old temp file: {file_path}")
    except Exception as e:
        print(f"Error cleaning up temp files: {e}")

# Download, extract, and summarize a Theseus thesis.
def summarize(thesis_key):
    try:
        print(f"\n====== THESEUS PROVIDER ======")
        print(f"thesis_key: {thesis_key}")
        
        # Construct full URL
        if not thesis_key.startswith('http'):
            if thesis_key.startswith('/handle/'):
                full_url = THESEUS_BASE + thesis_key
            else:
                thesis_key = '/handle/' + thesis_key.lstrip('/').replace('#', '')
                full_url = THESEUS_BASE + thesis_key
        else:
            full_url = thesis_key
        
        print(f"DOWNLOADING FILE FROM: {full_url}")
        
        # Periodic cleanup
        if hash(thesis_key) % 100 < 5:
            cleanup_temp_files()
        
        # Download PDF
        temp_file_path = download_file(full_url)
        if not temp_file_path:
            return {"error": "PDF download failed"}
        
        # Extract text
        pdf_text = extract_text_from_pdf(temp_file_path)
        if not pdf_text:
            return {
                "error": "No text extracted",
                "summary": "• No text could be extracted from the PDF. Try a different thesis."
            }
        
        # Extract abstract
        abstract_text = extract_abstract_content(pdf_text)
        print(f"EXTRACTED ABSTRACT ({len(abstract_text)} chars)")
        print(abstract_text[:500] + '...' if len(abstract_text) > 500 else abstract_text)

        # Generate summary
        summary = generate_thesis_points(abstract_text)
        
        return {
            "summary": summary,
            "text": pdf_text[:1000] + "..." if len(pdf_text) > 1000 else pdf_text
        }
    except Exception as e:
        print(f"Error in theseus_provider.summarize: {e}")
        return {"error": str(e)}

