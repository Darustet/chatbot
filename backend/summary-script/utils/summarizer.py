from transformers import pipeline
import re


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

try:
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn", use_fast=True)
    print("Successfully loaded facebook/bart-large-cnn model")
except Exception as e:
    print(f"Warning: Failed to load the summarization model: {e}")
    summarizer = None
  
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

# Use transformer-based summarizer to create a summary, and if that fails or is not available,  falls back to a manual summarization method
def generate_thesis_points(abstract_text):
    try:
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