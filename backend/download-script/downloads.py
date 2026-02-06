from flask import Flask, jsonify, request
import pdfplumber
from markupsafe import escape
from flask_cors import CORS, cross_origin
from transformers import pipeline
import os
import requests
import time
import urllib.parse
import re
import tempfile

try:
    import nltk
    try:
        nltk.data.find('tokenizers/punkt')
        # nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        print("Downloading NLTK resources...")
        nltk.download('punkt')
        # nltk.download('punkt_tab')
    from nltk.tokenize import sent_tokenize
except ImportError:
    print("Warning: nltk not installed. Falling back to simple split.")
    sent_tokenize = None

TEMP_DIR = os.path.join(tempfile.gettempdir(), 'thesis_temp')
os.makedirs(TEMP_DIR, exist_ok=True)

try:
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn", use_fast=True)
    print("Successfully loaded facebook/bart-large-cnn model")
except Exception as e:
    print(f"Warning: Failed to load the summarization model: {e}")
    summarizer = None

try:
    from bs4 import BeautifulSoup
    bs4_available = True
    print("BeautifulSoup is available for HTML parsing")
except ImportError:
    bs4_available = False
    print("WARNING: BeautifulSoup4 is not installed. Install with: pip install beautifulsoup4")
    print("HTML parsing for PDF links will not be available")

def download_file(url):
    try:
        if not url.startswith('http'):
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

def extract_text_from_pdf(pdf_path):
    try:
        if not pdf_path or not os.path.exists(pdf_path):
            print(f"PDF path does not exist: {pdf_path}")
            return ""
        with pdfplumber.open(pdf_path) as pdf:
            abstract_text = ""
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
            if not abstract_text and len(pdf.pages) >= 2:
                try:
                    abstract_text = pdf.pages[0].extract_text() + "\n" + pdf.pages[1].extract_text()
                except Exception as e:
                    print(f"Error extracting fallback text: {e}")
            if len(pdf.pages) > 0 and not abstract_text:
                abstract_text = pdf.pages[0].extract_text()
            return abstract_text if abstract_text else ""
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def extract_abstract_content(text):
    lines = text.split('\n')
    abstract_start = -1
    abstract_end = len(lines)
    for i, line in enumerate(lines[:20]):
        if (re.match(r'^\s*ABSTRACT\s*$', line, re.IGNORECASE) or
            re.match(r'^\s*TIIVISTELMÄ\s*$', line, re.IGNORECASE) or
            re.search(r'^\s*Abstract[:\.]', line, re.IGNORECASE) or
            re.search(r'^\s*Tiivistelmä[:\.]', line, re.IGNORECASE)):
            abstract_start = i + 1
            print(f"Found abstract header at line {i}: '{line}'")
            break
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

def manual_summarize(text, num_points=4):
    if not sent_tokenize:
        sentences = [s.strip() for s in re.split(r'[.!?]', text) if s.strip()]
    else:
        sentences = sent_tokenize(text)
    valid_sentences = [s for s in sentences if len(s) > 30 and not re.match(r'^(author|title|degree|supervisor|instructor|pages|date)', s.lower())]
    if len(valid_sentences) >= num_points:
        # Pick first, middle 2, and last sentence for diversity
        points = [
            valid_sentences[0],
            valid_sentences[len(valid_sentences)//3],
            valid_sentences[(2*len(valid_sentences))//3],
            valid_sentences[-1]
        ]
    else:
        points = valid_sentences[:num_points]
    return '\n'.join([f"• {point.strip()}" for point in points])

def generate_thesis_points(text):
    try:
        abstract_text = extract_abstract_content(text)
        print(f"EXTRACTED ABSTRACT ({len(abstract_text)} chars):")
        print(abstract_text[:500] + '...' if len(abstract_text) > 500 else abstract_text)
        if not abstract_text or len(abstract_text) < 60:
            return "• No meaningful abstract content found to summarize.\n• The PDF might not contain an abstract section.\n• Try a different thesis."
        manual_points = manual_summarize(abstract_text, num_points=4)
        if summarizer:
            try:
                input_length = len(abstract_text.split())
                max_length = min(150, max(input_length // 3, 30))
                print(f"Using facebook/bart-large-cnn with max_length={max_length}")
                summary = summarizer(
                    abstract_text,
                    max_length=max_length,
                    min_length=min(max_length-10, 20),
                    do_sample=False,
                    truncation=True
                )[0]['summary_text']
                print(f"Raw transformer summary: {summary}")
                if sent_tokenize:
                    sentences = sent_tokenize(summary)
                    points = []
                    for s in sentences[:5]:  # Try to get up to 5 sentences
                        if len(s.strip()) > 10:
                            points.append(f"• {s.strip()}")
                    if len(points) >= 4:
                        result = '\n'.join(points[:4])
                        print(f"Using transformer summary with 4 points: {result}")
                        return result
                    elif len(points) >= 2:
                        result = '\n'.join(points)
                        print(f"Using transformer summary with fewer than 4 points: {result}")
                        return result
                    else:
                        print("Transformer summary too short, using manual summary instead")
                        return manual_points
                else:
                    return manual_points
            except Exception as e:
                print(f"Error during summarization: {e}")
                return manual_points
        else:
            print("Summarizer not available, using manual summary")
            return manual_points
    except Exception as e:
        print(f"Error in summarization process: {e}")
        return "• Could not generate summary points.\n• The thesis might be in a format that's difficult to process.\n• Try a different thesis."

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route('/download', methods=['GET'])
@cross_origin()
def download():
    try:
        print("\n====== NEW DOWNLOAD REQUEST ======")
        print("REQUEST ARGS:", request.args)
        key = request.args.get('key', default="", type=str)
        if key.startswith('"') and key.endswith('"'):
            key = key[1:-1]
        print("THESIS KEY:", key)
        if not key:
            print("Error: Empty thesis key provided")
            return jsonify({"error": "No thesis identifier provided"}), 400
        retrieve = request.args.get('retrieve', default="false", type=str)
        try:
            if not key.startswith('http'):
                if key.startswith('/handle/'):
                    full_url = 'https://www.theseus.fi' + key
                else:
                    key = '/handle/' + key.lstrip('/').replace('#', '')
                    full_url = 'https://www.theseus.fi' + key
            else:
                full_url = key
            print("DOWNLOADING FILE FROM:", full_url)
        except Exception as url_error:
            print(f"Error constructing URL: {url_error}")
            return jsonify({"error": f"Invalid thesis identifier format: {key}"}), 400
        if hash(key) % 100 < 5:
            cleanup_temp_files()
        if retrieve.lower() == "false":
            temp_file_path = download_file(full_url)
            if temp_file_path:
                try:
                    print(f"SUCCESS: Downloaded PDF to {temp_file_path}")
                    print(f"File size: {os.path.getsize(temp_file_path)} bytes")
                    pdf_text = extract_text_from_pdf(temp_file_path)
                    if not pdf_text:
                        print("ERROR: No text extracted from the PDF.")
                        backup_summary = "• No text could be extracted from the PDF. Try a different thesis."
                        return jsonify({"summary": backup_summary, "text": ""})
                    summary = generate_thesis_points(pdf_text)
                    return jsonify({
                        "summary": summary,
                        "text": pdf_text[:1000] + "..." if len(pdf_text) > 1000 else pdf_text
                    })
                except Exception as e:
                    print(f"Error extracting or summarizing PDF: {e}")
                    return jsonify({"error": "Failed to extract or summarize PDF"}), 500
            else:
                return jsonify({"error": "PDF download failed"}), 500
        else:
            return jsonify({"error": "Retrieve mode not supported"}), 400
    except Exception as e:
        print(f"Exception in /download: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/ping')
@cross_origin()
def ping():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(port=5000)
