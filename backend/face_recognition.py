import dlib
import numpy as np
import cv2
import os

# Load Dlib Models
detector = dlib.get_frontal_face_detector()
sp = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")
face_rec_model = dlib.face_recognition_model_v1("dlib_face_recognition_resnet_model_v1.dat")

def get_face_embedding(image_path):
    """Extracts 128-d face embedding from the given image"""
    img = cv2.imread(image_path)
    if img is None:
        return None
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = detector(gray)

    if len(faces) == 0:
        return None

    shape = sp(gray, faces[0])
    face_descriptor = face_rec_model.compute_face_descriptor(img, shape)
    
    return np.array(face_descriptor)  # 128-d vector

def euclidean_distance(vec1, vec2):
    """Compute Euclidean distance between two embeddings"""
    return np.linalg.norm(vec1 - vec2)