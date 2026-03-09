
import requests
from urllib.parse import quote
from utils.summarizer import generate_thesis_points

HELDA_API_BASE = "https://helda.helsinki.fi"

def handle_to_uuid(thesis_id):
  try:
    encoded_id = quote(thesis_id, safe="")
    url = f"{HELDA_API_BASE}/server/api/pid/find?id={encoded_id}"
    print(f"Resolving handle via pid/find: {url}")

    response = requests.get(url, timeout=15, allow_redirects=True)
    response.raise_for_status()

    data = response.json()

    # Use uuid directly if present
    uuid = data.get("uuid")
    if uuid:
      print(f"Resolved UUID from body: {uuid}")
      return uuid

    # Fallback: parse from self link
    self_href = data.get("_links", {}).get("self", {}).get("href", "")
    if self_href and "/server/api/core/items/" in self_href:
      uuid = self_href.rstrip("/").split("/")[-1]
      print(f"Resolved UUID from self link: {uuid}")
      return uuid

    # Fallback: parse from owning item link if present
    item_href = data.get("_links", {}).get("item", {}).get("href", "")
    if item_href and "/server/api/core/items/" in item_href:
      uuid = item_href.rstrip("/").split("/")[-1]
      print(f"Resolved UUID from item link: {uuid}")
      return uuid

    print("Could not resolve UUID from pid/find response")
    return None

  except requests.RequestException as e:
    print(f"Handle resolve error: {e}")
    return None
  except Exception as e:
    print(f"Handle parse error: {e}")
    return None

def get_access_status(item_data):
  try:
    access_status_url = item_data.get("_links", {}).get("accessStatus", {}).get("href", "")
    if not access_status_url:
      return None

    response = requests.get(access_status_url, timeout=10)
    response.raise_for_status()
    access_data = response.json()
    return access_data.get("status")
  except requests.RequestException as e:
    print(f"Error fetching Helda access status: {e}")
    return None
  except Exception as e:
    print(f"Error parsing Helda access status response: {e}")
    return None

def get_helda_abstract(thesis_id):
  api_url = f"{HELDA_API_BASE}/server/api/core/items/{thesis_id}"
  print(f"fetch data from {api_url}")

  try:
    response = requests.get(api_url, timeout=15)
    response.raise_for_status()
    data = response.json()

    abstracts = data.get("metadata", {}).get("dc.description.abstract", [])

    abstract_text = ""
    for abs_item in abstracts:
      if abs_item.get("language") == "en":
        abstract_text = abs_item.get("value", "")
        break

    if not abstract_text:
      for abs_item in abstracts:
        if abs_item.get("language") == "fi":
          abstract_text = abs_item.get("value", "")
          break

    if not abstract_text and abstracts:
      abstract_text = abstracts[0].get("value", "")

    print(f"Extracted Helda abstract ({len(abstract_text)} chars): {abstract_text[:200]}...")
    access_status = get_access_status(data)

    return {
      "abstract_text": abstract_text,
      "access_status": access_status
    }

  except requests.RequestException as e:
    print(f"Error fetching from Helda API: {e}")
    return {"abstract_text": "", "access_status": None}
  except Exception as e:
    print(f"Error parsing Helda response: {e}")
    return {"abstract_text": "", "access_status": None}

def summarize(thesis_id):
  try:
    print(f"\n====== HELDA PROVIDER ======")
    print(f"thesis_id: {thesis_id}")

    # Convert handle -> UUID if needed
    if "/" in thesis_id:
      thesis_id = handle_to_uuid(thesis_id)
      print(f"resolved uuid: {thesis_id}")

      if not thesis_id:
        return {
          "error": "Invalid thesis ID",
          "message": "Could not resolve handle to UUID via DSpace pid endpoint."
        }

    provider_data = get_helda_abstract(thesis_id)
    abstract_text = provider_data.get("abstract_text", "")
    access_status = provider_data.get("access_status")

    if not abstract_text:
      if access_status == "restricted":
        return {
          "summary": (
            "• This thesis is restricted and not publicly available online.\n"
            "• Helda API reports access status as restricted.\n"
            "• Because abstract access is limited, an automatic summary cannot be generated."
          ),
          "text": ""
        }

      return {
        "error": "No abstract found",
        "message": "The thesis might not be available for access online or the API does not provide an abstract. Try a different thesis."
      }

    summary = generate_thesis_points(abstract_text)

    return {
      "summary": summary,
      "text": ""
    }

  except Exception as e:
    print(f"Error in helda_provider.summarize: {e}")
    return {"error": str(e)}
