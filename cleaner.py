import numpy as np
from scipy.signal import butter, lfilter

class EEGCleaner:
    def __init__(self, fs=250):
        """
        fs: Sampling frequency (BrainFlow synthetic is 250Hz by default)
        """
        self.fs = fs

    def bandpass_filter(self, data, lowcut=8, highcut=30, order=4):
        nyq = 0.5 * self.fs
        low = lowcut / nyq
        high = highcut / nyq
        b, a = butter(order, [low, high], btype='band')
        
        # We apply the filter across the time axis (axis=1)
        return lfilter(b, a, data, axis=1)

    def get_psd_features(self, cleaned_data):
        """
        In layman's terms: This measures the 'strength' of the signal.
        We take the mean square of the filtered waves to get a single number 
        per channel representing the energy.
        """
        return np.mean(np.square(cleaned_data), axis=1)

# --- QUICK TEST ---
if __name__ == "__main__":
    # Create fake raw data (8 channels, 250 samples)
    fake_raw = np.random.normal(0, 1, (8, 250))
    cleaner = EEGCleaner()
    
    filtered = cleaner.bandpass_filter(fake_raw)
    features = cleaner.get_psd_features(filtered)
    
    print(f"Filtered Shape: {filtered.shape}")
    print(f"Extracted Features (Energy per channel):")
    print(features)