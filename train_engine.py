import mne
import joblib
from moabb.datasets import BNCI2014_001
from moabb.paradigms import LeftRightImagery
from mne.decoding import CSP
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline

# 1. Fetch the BCI Competition IV 2a Dataset (Subject 1)
print("Downloading BCI IV 2a Dataset... (This might take a minute)")
dataset = BNCI2014_001()
paradigm = LeftRightImagery(fmin=8, fmax=30) # Isolate Mu/Beta waves

# 2. Get data for Subject 1 (X = Signals, y = Labels 'left'/'right')
X, y, metadata = paradigm.get_data(dataset=dataset, subjects=[1])

# 3. Build the BCI Pipeline:
# CSP helps distinguish Left vs Right patterns in space.
# SVM draws the "Great Divider" boundary.
clf = Pipeline([
    ('CSP', CSP(n_components=4, reg=None, log=True, norm_trace=False)),
    ('SVM', SVC(kernel='linear', probability=True))
])

# 4. Fit the model to real brainwave data
print("Training the Intelligence Layer...")
clf.fit(X, y)

# 5. Save the 'Brain' file
joblib.dump(clf, 'cerebro_model.pkl')
print("\nSuccess! 'cerebro_model.pkl' created. The intelligence is now ready.")