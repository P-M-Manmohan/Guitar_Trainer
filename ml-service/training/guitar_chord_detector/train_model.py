import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# 1. Load the dataset
print("Loading dataset...")
df = pd.read_csv('chord_dataset.csv')

# Separate features (X) and labels (y)
# Column 0 is the label string, columns 1-63 are the float coordinates
X = df.iloc[:, 1:].values
y = df.iloc[:, 0].values

# 2. Encode the text labels into integers (e.g., 'A_Major' -> 0, 'C_Major' -> 1)
encoder = LabelEncoder()
y_encoded = encoder.fit_transform(y)
num_classes = len(encoder.classes_)

print(f"Detected {num_classes} classes: {encoder.classes_}")

# 3. Split the data into Training (80%) and Validation (20%) sets
X_train, X_val, y_train, y_val = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42
)

# 4. Build the Neural Network Architecture
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(63,)),
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dense(num_classes, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

# 5. Train the model
print("\nStarting training...")
history = model.fit(
    X_train, y_train,
    epochs=40,               # Passes through the data 40 times
    batch_size=32,           # Updates weights after every 32 rows
    validation_data=(X_val, y_val)
)

# 6. Save the trained model (overwriting the dummy model)
model.save('chord_model.h5')
print("\nSuccess! Trained model saved as 'chord_model.h5'.")

# Save the exact class ordering so the live camera knows what 0, 1, and 2 mean
np.save('classes.npy', encoder.classes_)
print("Class mapping saved as 'classes.npy'.")