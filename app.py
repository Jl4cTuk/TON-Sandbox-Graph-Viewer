from flask import Flask, render_template, request, send_from_directory, jsonify
import os
import json

app = Flask(__name__)

GRAPH_DIR = os.getenv("TON_GRAPH_PATH", os.path.expanduser("~/.local/share/graphs"))

if not os.path.exists(GRAPH_DIR):
    os.makedirs(GRAPH_DIR, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory("static", filename)

@app.route("/graphs")
def list_graphs():
    all_files = [f for f in os.listdir(GRAPH_DIR) if f.endswith(".json")]
    files_sorted = sorted(
        all_files,
        key=lambda f: os.path.getmtime(os.path.join(GRAPH_DIR, f)),
        reverse=True
    )
    return jsonify(files_sorted)

@app.route("/graph/<filename>")
def get_graph_by_filename(filename):
    file_path = os.path.join(GRAPH_DIR, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": f"{filename} not found"}), 404

    with open(file_path, "r") as f:
        return jsonify(json.load(f))

@app.route("/static/generateGraph.ts")
def get_script():
    return send_from_directory("static", "generateGraph.ts")

@app.route("/upload", methods=["POST"])
def upload_graph():
    if "file" not in request.files:
        return jsonify({"success": False, "error": "file not found"}), 400

    file = request.files["file"]

    if not file.filename.endswith(".json"):
        return jsonify({"success": False, "error": "only json"}), 400

    file_path = os.path.join(GRAPH_DIR, file.filename)
    file.save(file_path)

    return jsonify({"success": True, "message": "ok", "filename": file.filename})


if __name__ == "__main__":
    os.makedirs(GRAPH_DIR, exist_ok=True)
    app.run(host="0.0.0.0", port=5000, debug=True)
