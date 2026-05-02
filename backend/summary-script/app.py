from flask import Flask, jsonify, request
from markupsafe import escape
from flask_cors import CORS, cross_origin
from providers import get_provider
import os
import pickle
import sys

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'exports', 'tfidf_model.pkl')
_ml_model = None


def get_ml_model():
    global _ml_model
    if _ml_model is not None:
        return _ml_model

    if not os.path.exists(MODEL_PATH):
        return None

    with open(MODEL_PATH, 'rb') as f:
        _ml_model = pickle.load(f)
    return _ml_model

@app.route('/summary', methods=['GET'])
@cross_origin()

# Thesis summarization endpoint using provider
# Query params:
# - uni: University code (AALTO, THESEUS, etc.)
# - thesisId: For AALTO (DSpace item ID)
# - key: For THESEUS (handle or URL)
def summary() -> dict:
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
        if not provider:
            return jsonify({"error": f"Unsupported university code: {uni}"}), 400
        
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


@app.route('/ml-ready')
@cross_origin()
def ml_ready():
    model_exists = os.path.exists(MODEL_PATH)
    try:
        import sklearn
        sklearn_version = sklearn.__version__
        sklearn_ok = True
        sklearn_error = None
    except Exception as e:
        sklearn_version = None
        sklearn_ok = False
        sklearn_error = str(e)

    return jsonify({
        "python_executable": sys.executable,
        "python_version": sys.version,
        "cwd": os.getcwd(),
        "model_path": MODEL_PATH,
        "model_exists": model_exists,
        "sklearn_ok": sklearn_ok,
        "sklearn_version": sklearn_version,
        "sklearn_error": sklearn_error,
    })


@app.route('/classify-thesis', methods=['POST'])
@cross_origin()
def classify_thesis():
    try:
        model = get_ml_model()
        if model is None:
            return jsonify({"error": f"Model file not found: {MODEL_PATH}"}), 503

        body = request.get_json(silent=True) or {}
        text = str(body.get('text', '')).strip()

        if not text:
            return jsonify({"error": "Missing required field: text"}), 400

        prob = float(model.predict_proba([text])[0][1])

        return jsonify({
            "probability": prob
        })
    except ModuleNotFoundError as e:
        # Typical case when scikit-learn is missing in summary-script venv.
        return jsonify({
            "error": f"Missing Python dependency for model loading: {str(e)}",
            "python_executable": sys.executable,
            "python_version": sys.version,
            "cwd": os.getcwd(),
            "model_path": MODEL_PATH,
            "model_exists": os.path.exists(MODEL_PATH),
        }), 503
    except FileNotFoundError as e:
        return jsonify({"error": f"Model file error: {str(e)}"}), 503
    except Exception as e:
        print(f"Exception in /classify-thesis: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print(f"Starting ML service with Python: {sys.executable}")
    app.run(port=5001)
