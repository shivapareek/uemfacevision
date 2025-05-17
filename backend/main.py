from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import cv2
import dlib
import numpy as np
import sqlite3
from typing import List
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
import zipfile

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folders for serving images
app.mount("/faces", StaticFiles(directory="faces"), name="faces")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Storage for images
UPLOAD_FOLDER = "uploads"
FACE_FOLDER = "faces"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(FACE_FOLDER, exist_ok=True)

# Load Dlib models
detector = dlib.get_frontal_face_detector()
sp = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")
facerec = dlib.face_recognition_model_v1("dlib_face_recognition_resnet_model_v1.dat")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database setup
conn = sqlite3.connect("database.db", check_same_thread=False)
cursor = conn.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS faces (id INTEGER PRIMARY KEY, embedding BLOB, image_path TEXT)")
conn.commit()

def get_face_embeddings(image_path):
    """Detect and return embeddings for all faces in an image."""
    print(f"Processing Image: {image_path}")  # ✅ Debugging
    
    image = cv2.imread(image_path)
    if image is None:
        print(f"❌ ERROR: Image {image_path} not found!")  # ✅ Debugging
        return []

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    faces = detector(rgb)

    print(f"Faces Detected: {len(faces)}")  # ✅ Debugging

    if len(faces) == 0:
        return []  # No faces found

    face_data = []  # Store (embedding, face_path) for all detected faces

    for i, face in enumerate(faces):
        shape = sp(rgb, face)
        embedding = np.array(facerec.compute_face_descriptor(rgb, shape))

        x, y, w, h = face.left(), face.top(), face.width(), face.height()
        face_crop = image[y:y+h, x:x+w]

        face_filename = os.path.join(FACE_FOLDER, f"{os.path.basename(image_path)}_face{i}.jpg")
        cv2.imwrite(face_filename, face_crop)

        print(f"✅ Face {i} saved at {face_filename}")  # ✅ Debugging
        face_data.append((embedding, face_filename))

    return face_data  # List of (embedding, face image path)

@app.get("/")
async def root():
    return {"message": "Backend is running! Use /docs for API."}

@app.post("/upload/")
async def upload_files(user_id: str, files: List[UploadFile] = File(...)):
    """Upload multiple images and save them to user-specific folders."""
    user_folder = os.path.join(UPLOAD_FOLDER, user_id)
    os.makedirs(user_folder, exist_ok=True)  # Create folder if it doesn't exist

    detected_faces = []
    for file in files:
        file_path = os.path.join(user_folder, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())

        face_embeddings = get_face_embeddings(file_path)  # Detect faces
        for embedding, face_path in face_embeddings:
            cursor.execute("INSERT INTO faces (embedding, image_path, user_id) VALUES (?, ?, ?)",
                           (embedding.tobytes(), face_path, user_id))
            conn.commit()
            detected_faces.append(os.path.basename(face_path))

    return {"message": "Upload successful!", "faces": detected_faces}


@app.get("/get_faces/")
async def get_faces(user_id: str):
    print(f"Received user_id: {user_id}")  # Debugging

    cursor.execute("SELECT id, embedding, image_path FROM faces WHERE user_id = ?", (user_id,))
    faces = cursor.fetchall()
    print(f"Faces fetched from database: {faces}")  # Debugging

    unique_faces = []
    seen_embeddings = []

    for face_id, embedding_blob, img_path in faces:
        embedding = np.frombuffer(embedding_blob, dtype=np.float64)

        print(f"Processing face: {img_path}")  # Debugging
        is_duplicate = any(np.linalg.norm(embedding - np.array(e)) < 0.6 for e in seen_embeddings)

        if not is_duplicate:
            # Check if the uploaded images associated with this face exist
            original_image_name = os.path.basename(img_path).split("_face")[0]
            original_image_path = os.path.join(UPLOAD_FOLDER, user_id, original_image_name)

            if os.path.exists(original_image_path):  # If original image exists
                seen_embeddings.append(embedding)
                unique_faces.append(f"http://127.0.0.1:8000/{img_path}")
                print(f"Unique face added: {img_path}")
            else:
                print(f"❌ Face removed as no associated images exist: {img_path}")  # Debugging

    print(f"Filtered faces: {unique_faces}")  # Debugging
    return {"faces": unique_faces}



@app.get("/get_images/")
async def get_images(face: str = Query(...), user_id: str = Query(...)):
    """Return all original images associated with a selected face for a user."""
    face_filename = face.split("/")[-1]

    # Find embedding of the selected face
    cursor.execute("SELECT embedding FROM faces WHERE image_path LIKE ? AND user_id = ?", 
                   (f"%{face_filename}", user_id))
    result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Face not found in database.")

    selected_embedding = np.frombuffer(result[0], dtype=np.float64)

    # Find all uploaded images with embeddings similar to the selected face
    cursor.execute("SELECT embedding, image_path FROM faces WHERE user_id = ?", (user_id,))
    images = cursor.fetchall()

    matched_original_images = set()

    for img_embedding, img_path in images:
        stored_embedding = np.frombuffer(img_embedding, dtype=np.float64)
        distance = np.linalg.norm(selected_embedding - stored_embedding)

        # Match images only if embedding similarity is below threshold
        if distance < 0.55:  # Stricter threshold
            # Extract the original uploaded image path
            original_image_name = os.path.basename(img_path).split("_face")[0]
            original_image_path = os.path.join(UPLOAD_FOLDER, user_id, original_image_name)

            if os.path.exists(original_image_path):
                matched_original_images.add(f"http://127.0.0.1:8000/uploads/{user_id}/{original_image_name}")

    return {"images": list(matched_original_images)}






@app.get("/get_all_images/")
async def get_all_images(user_id: str):
    """Return all images uploaded by the logged-in user."""
    user_folder = os.path.join(UPLOAD_FOLDER, user_id)
    valid_images = []

    if os.path.exists(user_folder):
        valid_images = [
            f"http://127.0.0.1:8000/uploads/{user_id}/{file}" for file in os.listdir(user_folder)
            if os.path.isfile(os.path.join(user_folder, file))
        ]

    return {"images": valid_images}


@app.get("/process_all_images/")
async def process_all_images():
    """Process all existing images in the 'uploads' folder to detect faces."""
    all_files = os.listdir(UPLOAD_FOLDER)
    processed_faces = []

    for file in all_files:
        file_path = os.path.join(UPLOAD_FOLDER, file)

        face_embeddings = get_face_embeddings(file_path)  # Detect faces in all images

        for embedding, face_path in face_embeddings:
            cursor.execute("INSERT INTO faces (embedding, image_path) VALUES (?, ?)", 
                           (embedding.tobytes(), face_path))
            conn.commit()
            processed_faces.append(os.path.basename(face_path))

    return {"message": "All existing images processed!", "faces": processed_faces} 

@app.delete("/delete_image/")
async def delete_image(user_id: str, filename: str):
    file_path = os.path.join(UPLOAD_FOLDER, user_id, filename)
    if os.path.exists(file_path):  # Check if the file exists
        os.remove(file_path)  # Delete the file
        return JSONResponse(status_code=200, content={"message": "Image deleted successfully!"})
    else:
        raise HTTPException(status_code=404, detail="Image not found")
    


    
    




