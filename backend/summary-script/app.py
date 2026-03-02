from flask import Flask, jsonify, request
from markupsafe import escape
from flask_cors import CORS, cross_origin
from providers import get_provider

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route('/summary', methods=['GET'])
@cross_origin()

# Thesis summarization endpoint using provider
# Query params:
# - uni: University code (AALTO, THESEUS, etc.)
# - thesisId: For AALTO (DSpace item ID)
# - key: For THESEUS (handle or URL)
def summary():
    try:
        print("\n====== NEW SUMMARY REQUEST ======")
        print("REQUEST ARGS:", request.args)
        
        # Extract parameters
        uni = request.args.get('uni', default="", type=str)
        thesis_id = request.args.get('thesisId', default="", type=str)
        key = request.args.get('key', default="", type=str)
        
        # Strip quotes if present
        if key.startswith('"') and key.endswith('"'):
            key = key[1:-1]
        
        # Validate parameters
        if not uni:
            return jsonify({"error": "No university code provided"}), 400
        
        identifier = thesis_id if uni.upper() == 'AALTO' else key
        if not identifier:
            return jsonify({"error": "No thesis identifier provided"}), 400
        
        print(f"University: {uni}, Identifier: {identifier}")
        
        # Get appropriate provider and call summarize
        provider = get_provider(uni)
        result = provider.summarize(identifier)
        
        # Handle error responses
        if "error" in result:
            error_msg = result["error"]
            print(f"Provider error: {error_msg}")
            return jsonify(result), 500 if "get summary failed" in error_msg.lower() else 400
        
        # Return successful result
        return jsonify(result)
        
    except Exception as e:
        print(f"Exception in /summary: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/ping')
@cross_origin()
def ping():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(port=5000)
