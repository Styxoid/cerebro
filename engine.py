import numpy as np
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
import joblib

class EEGEngine:
    def __init__(self):
        # We use 'rbf' kernel for non-linear brainwave patterns
        self.model = SVC(kernel='rbf', probability=True)
        self.scaler = StandardScaler()
        self.is_trained = False

    def train_synthetic(self):
        """
        Creates fake 'Left', 'Right', and 'Rest' data to prime the engine.
        Left = High energy, Right = Medium energy, Rest = Low energy.
        """
        print("Training engine with synthetic data...")
        # 30 examples for each state, 8 channels each
        rest = np.random.normal(0.5, 0.1, (30, 8))
        left = np.random.normal(2.0, 0.3, (30, 8))
        right = np.random.normal(1.2, 0.2, (30, 8))
        
        X = np.vstack([rest, left, right])
        y = np.array(['S']*30 + ['L']*30 + ['R']*30) # S=Stop, L=Left, R=Right
        
        # Scaling is mandatory for SVM to work correctly
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        print("Engine Trained and Ready!")

    def predict(self, features):
        """
        Takes the 8 energy numbers and returns 'L', 'R', or 'S'.
        """
        if not self.is_trained:
            return "Engine not trained!"
        
        # Reshape and scale the single feature set
        scaled_features = self.scaler.transform(features.reshape(1, -1))
        return self.model.predict(scaled_features)[0]

# --- QUICK TEST ---
if __name__ == "__main__":
    engine = EEGEngine()
    engine.train_synthetic()
    
    # Test with a 'High Energy' input (Should predict 'L')
    test_input = np.array([2.1, 1.9, 2.0, 2.2, 1.8, 2.0, 2.1, 1.9])
    prediction = engine.predict(test_input)
    print(f"Test Prediction for High Energy input: {prediction}")