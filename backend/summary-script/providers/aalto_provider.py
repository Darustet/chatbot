import requests
from utils.summarizer import generate_thesis_points

AALTO_BASE_URL = "https://aaltodoc.aalto.fi"


def get_aalto_access_status(item_data):
    try:
        access_status_url = item_data.get('_links', {}).get('accessStatus', {}).get('href', '')
        if not access_status_url:
            return None

        response = requests.get(access_status_url, timeout=10)
        response.raise_for_status()
        access_data = response.json()
        return access_data.get('status')
    except requests.RequestException as e:
        print(f"Error fetching Aalto access status: {e}")
        return None
    except Exception as e:
        print(f"Error parsing Aalto access status response: {e}")
        return None


def get_aalto_abstract(thesis_id):
    api_url = f"{AALTO_BASE_URL}/server/api/core/items/{thesis_id}"
    print(f"fetch data from {api_url}")
    
    try:
        response = requests.get(api_url, timeout=15)
        response.raise_for_status()
        data = response.json()
        # Get abstract from metadata
        abstracts = data.get('metadata', {}).get('dc.description.abstract', [])
        # If abstract is found in english, take that, otherwise take Finnish version, if it is available
        abstract_text = ""
        for abs in abstracts:
            if abs.get('language') == 'en':
                abstract_text = abs.get('value', '')
                break
        if not abstract_text:
            for abs in abstracts:
                if abs.get('language') == 'fi':
                    abstract_text = abs.get('value', '')
                    break
        print(f"Extracted Aalto abstract ({len(abstract_text)} chars): {abstract_text[:200]}...")
        access_status = get_aalto_access_status(data)
        return {
            "abstract_text": abstract_text,
            "access_status": access_status
        }
    
    except requests.RequestException as e:
        print(f"Error fetching from Aalto API: {e}")
        return {"abstract_text": "", "access_status": None}
    except Exception as e:
        print(f"Error parsing Aalto response: {e}")
        return {"abstract_text": "", "access_status": None}
  
# Fetch and summarize an Aalto thesis by ID, using the abstract from the API and generating summary points from it
def summarize(thesis_id):
    try:
        print(f"\n====== AALTO PROVIDER ======")
        print(f"thesis_id: {thesis_id}")
        
        # Fetch abstract from API
        provider_data = get_aalto_abstract(thesis_id)
        abstract_text = provider_data.get("abstract_text", "")
        access_status = provider_data.get("access_status")
        
        if not abstract_text:
            if access_status == "restricted":
                return {
                    "summary": "• This thesis is restricted and not publicly available online.\n• Aalto API reports access status as restricted.\n• Because abstract access is limited, an automatic summary cannot be generated.",
                    "text": ""
                }

            return {
                "error": "No abstract found",
                "message": "The thesis might not be available for access online or the API does not provide an abstract. Try a different thesis."
            }
        
        # Generate summary points
        summary = generate_thesis_points(abstract_text)
        
        return {
            "summary": summary,
            "text": ""  # Aalto API doesn't provide full text, only abstract
        }
    
    except Exception as e:
        print(f"Error in aalto_provider.summarize: {e}")
        return {"error": str(e)}
