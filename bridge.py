import serial
import time

class SerialBridge:
    def __init__(self, port='COM3', baudrate=115200):
        """
        port: Usually 'COM3' or 'COM4' on Windows. 
        Check Arduino IDE -> Tools -> Port to find yours.
        """
        self.port = port
        self.baudrate = baudrate
        self.ser = None

    def connect(self):
        try:
            self.ser = serial.Serial(self.port, self.baudrate, timeout=0.1)
            # Give the ESP32 2 seconds to reboot after serial connection
            time.sleep(2) 
            print(f"Successfully connected to ESP32 on {self.port}")
            return True
        except Exception as e:
            print(f"Warning: Could not connect to ESP32 on {self.port}. Running in VIRTUAL MODE.")
            print(f"Error Details: {e}")
            return False

    def send_command(self, command):
        """
        Sends 'L', 'R', or 'S' to the ESP32.
        """
        if self.ser and self.ser.is_open:
            self.ser.write(command.encode())
            print(f"Bridge -> Sent '{command}' to Robot")
        else:
            print(f"Virtual Bridge -> Robot would receive: '{command}'")

    def close(self):
        if self.ser:
            self.ser.close()
            print("Serial connection closed.")

# --- QUICK TEST ---
if __name__ == "__main__":
    # Test with COM3 (Change this if you know your ESP32 port)
    bridge = SerialBridge(port='COM3') 
    bridge.connect()
    
    # Simulate sending the three states
    for cmd in ['L', 'R', 'S']:
        bridge.send_command(cmd)
        time.sleep(1)
    
    bridge.close()