import joblib
import numpy as np
import socket
import requests
import time

# --- CONFIGURATION ---
MODEL_PATH = 'cerebro_model.pkl'
ESP32_IP = "192.168.4.1" # Default for ESP32 AP mode or check your hotspot
ESP32_PORT = 12345
FLASK_URL = "http://127.0.0.1:5000/update" # UI Teammate's endpoint

# 1. Load the Brain
model = joblib.load(MODEL_PATH)
udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

def send_to_robot(command):
    try:
        udp_sock.sendto(command.encode(), (ESP32_IP, ESP32_PORT))
    except Exception as e:
        print(f"Robot Comms Error: {e}")

def send_to_ui(intent, confidence):
    try:
        # Pushes data to your teammate's Flask server
        requests.post(FLASK_URL, json={'intent': intent, 'confidence': confidence})
    except:
        pass # UI might not be up yet

print("--- CEREBRO MASTER BRIDGE ACTIVE ---")

try:
    while True:
        # TODO: Replace with real BrainFlow/Headset data stream
        mock_data = np.random.randn(1, 22, 1000) 
        
        prediction = model.predict(mock_data)[0]
        confidence = np.max(model.predict_proba(mock_data)) * 100
        
        # Mapping model output to Robot commands
        cmd = 'S' # Default Stop
        if prediction == 'left_hand': cmd = 'L'
        if prediction == 'right_hand': cmd = 'R'
        
        # EXECUTE
        print(f"INTENT: {prediction.upper()} | CONF: {confidence:.2f}% -> SENDING: {cmd}")
        send_to_robot(cmd)
        send_to_ui(prediction, confidence)
        
        time.sleep(0.5) # Frequency of 2Hz is good for stability
        
except KeyboardInterrupt:
    send_to_robot('S') # Safety stop on exit
    print("\nBridge Shutting Down.")