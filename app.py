from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# This line is crucial for the 404/OPTIONS issue
CORS(app, resources={r"/*": {"origins": "*"}})

# Default to Simulation Mode (0 for SIM, 1 for HARDWARE)
active_mode = 0 
latest_data = {"intent": "STOP", "confidence": 0, "source": "IDLE"}

@app.route('/update', methods=['POST'])
def update_data():
    global latest_data
    data = request.json
    incoming_source = data.get("source", "SIMULATION")
    if (active_mode == 0 and incoming_source == "SIMULATION") or \
       (active_mode == 1 and incoming_source == "HARDWARE"):
        latest_data = data
        return jsonify({"status": "accepted"}), 200
    return jsonify({"status": "ignored"}), 200

# Added OPTIONS method here to fix the 404 error
@app.route('/set_mode', methods=['POST', 'OPTIONS'])
def set_mode():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    global active_mode
    data = request.json
    active_mode = data.get("mode", 0)
    mode_name = "HARDWARE" if active_mode == 1 else "SIMULATION"
    print(f"--- MODE SWITCHED TO: {mode_name} ---")
    return jsonify({"mode": mode_name})

@app.route('/stream', methods=['GET'])
def stream_data():
    return jsonify(latest_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)