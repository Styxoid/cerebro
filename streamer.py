import time
import numpy as np
from brainflow.board_shim import BoardShim, BrainFlowInputParams, BoardIds

class EEGStreamer:
    def __init__(self, board_id=BoardIds.SYNTHETIC_BOARD.value):
        """
        Defaulting to SYNTHETIC_BOARD so you can test tonight.
        At the hackathon, we change this ID to the actual headset ID.
        """
        self.params = BrainFlowInputParams()
        self.board_id = board_id
        self.board = BoardShim(self.board_id, self.params)
        
    def start(self):
        try:
            self.board.prepare_session()
            self.board.start_stream()
            print(f"Stream Started on Board {self.board_id}")
        except Exception as e:
            print(f"Error starting stream: {e}")

    def get_data(self, num_samples=250):
        """
        Pulls the latest 'num_samples' from the buffer.
        If your headset is 250Hz, 250 samples = 1 second of data.
        """
        return self.board.get_current_board_data(num_samples)

    def stop(self):
        self.board.stop_stream()
        self.board.release_session()
        print("Stream Stopped.")

# --- QUICK TEST ---
if __name__ == "__main__":
    streamer = EEGStreamer()
    streamer.start()
    time.sleep(2) # Wait for buffer to fill
    data = streamer.get_data(10)
    print(f"Captured data shape: {data.shape}") # Should show (Channels, Samples)
    streamer.stop()