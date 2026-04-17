import time
from streamer import EEGStreamer
from cleaner import EEGCleaner
from engine import EEGEngine
from bridge import SerialBridge

def run_cerebro():
    # 1. INITIALIZE ALL MODULES
    # Change 'COM3' to your actual port when you plug in the ESP32
    streamer = EEGStreamer()
    cleaner = EEGCleaner()
    engine = EEGEngine()
    bridge = SerialBridge(port='COM3') 

    # 2. PREPARE THE SYSTEM
    print("--- CEREBRO SYSTEM STARTING ---")
    bridge.connect()
    engine.train_synthetic() # Prime the AI
    streamer.start()
    
    print("\nSYSTEM ACTIVE. LIVE EEG PROCESSING STARTING...")
    print("Press Ctrl+C to emergency stop.\n")

    try:
        while True:
            # A. Get latest 1 second of data (250 samples)
            raw_data = streamer.get_data(250)
            
            # Check if we have enough data in the buffer
            if raw_data.shape[1] < 250:
                continue

            # B. Clean the data (Focus on 8-30Hz)
            # We use only the first 8 channels for this prototype
            cleaned = cleaner.bandpass_filter(raw_data[:8, :])
            
            # C. Extract Features (Energy)
            features = cleaner.get_psd_features(cleaned)
            
            # D. AI Decision
            command = engine.predict(features)
            
            # E. Send to Robot
            bridge.send_command(command)
            
            # Small delay to prevent CPU overload
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\nShutting down Cerebro...")
    finally:
        streamer.stop()
        bridge.close()

if __name__ == "__main__":
    run_cerebro()