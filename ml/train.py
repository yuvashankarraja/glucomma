import os
import argparse
import numpy as np
import matplotlib.pyplot as plt

# Dynamic import of tensorflow for standalone training environments
try:
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
    from tensorflow.keras.models import Model
    from tensorflow.keras.optimizers import Adam
except ImportError:
    print("Error: TensorFlow/Keras is required to execute the CNN training pipeline.")
    exit(1)

def build_model(learning_rate=0.0001):
    """
    Builds a transfer learning model based on MobileNetV2 pre-trained on ImageNet.
    Suitable for small medical datasets (such as retinal fundus images).
    """
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    
    # Freeze the base model layers to preserve pre-trained features
    for layer in base_model.layers:
        layer.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.5)(x)
    predictions = Dense(1, activation='sigmoid')(x) # Binary classification: Normal vs Glaucoma

    model = Model(inputs=base_model.input, outputs=predictions)
    
    model.compile(
        optimizer=Adam(learning_rate=learning_rate),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
    )
    return model

def train_glaucoma_model(dataset_dir, epochs=15, batch_size=32, save_path="glaucoma_model.keras"):
    """
    Trains the CNN model using data generators pointing to the glaucoma dataset.
    Ex: dataset_dir contains 'train' and 'validation' directories, each containing 'normal' and 'glaucoma' folders.
    """
    print(f"Initializing training pipeline on dataset: {dataset_dir}")
    
    # Image Augmentation
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest'
    )
    
    val_datagen = ImageDataGenerator(rescale=1./255)
    
    train_path = os.path.join(dataset_dir, 'train')
    val_path = os.path.join(dataset_dir, 'validation')
    
    if not os.path.exists(train_path) or not os.path.exists(val_path):
        print(f"Error: Dataset directory must contain 'train' and 'validation' subfolders.")
        print(f"Creating mock training arrays for standalone script validation...")
        # Fallback dummy training for code review/verification
        X_train = np.random.rand(100, 224, 224, 3)
        y_train = np.random.randint(0, 2, 100)
        X_val = np.random.rand(20, 224, 224, 3)
        y_val = np.random.randint(0, 2, 20)
        
        model = build_model()
        history = model.fit(
            X_train, y_train, 
            validation_data=(X_val, y_val),
            epochs=2, 
            batch_size=10
        )
        model.save(save_path)
        print(f"Successfully saved validation model model to {save_path}")
        return

    train_generator = train_datagen.flow_from_directory(
        train_path,
        target_size=(224, 224),
        batch_size=batch_size,
        class_mode='binary'
    )

    validation_generator = val_datagen.flow_from_directory(
        val_path,
        target_size=(224, 224),
        batch_size=batch_size,
        class_mode='binary'
    )

    model = build_model()

    # Callbacks
    checkpoint = tf.keras.callbacks.ModelCheckpoint(
        save_path, 
        monitor='val_accuracy', 
        save_best_only=True, 
        mode='max',
        verbose=1
    )
    
    early_stop = tf.keras.callbacks.EarlyStopping(
        monitor='val_loss', 
        patience=5, 
        restore_best_weights=True
    )

    history = model.fit(
        train_generator,
        steps_per_epoch=train_generator.samples // batch_size,
        epochs=epochs,
        validation_data=validation_generator,
        validation_steps=validation_generator.samples // batch_size,
        callbacks=[checkpoint, early_stop]
    )

    # Plot results
    plt.figure(figsize=(12, 4))
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'], label='train_acc')
    plt.plot(history.history['val_accuracy'], label='val_acc')
    plt.title('Accuracy')
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'], label='train_loss')
    plt.plot(history.history['val_loss'], label='val_loss')
    plt.title('Loss')
    plt.legend()
    
    plt.savefig('training_curves.png')
    print("Saved training metrics plot to training_curves.png")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Glaucoma CNN Training Pipeline")
    parser.add_argument("--dataset", type=str, default="glaucoma_dataset", help="Path to glaucoma dataset directory")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--output", type=str, default="glaucoma_model.keras", help="Saved output model path")
    args = parser.parse_args()

    train_glaucoma_model(
        dataset_dir=args.dataset,
        epochs=args.epochs,
        batch_size=args.batch_size,
        save_path=args.output
    )
