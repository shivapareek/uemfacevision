import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { registerWithEmailPassword, loginWithEmailPassword , sendPasswordResetEmail,getAuth} from "./firebase";
import { signInWithGoogle, logout, auth } from "./firebase"; // Import Google Auth
import { FaMoon, FaSun , FaTrash , FaDownload ,FaEye, FaEyeSlash } from "react-icons/fa"; 
import { MdFileDownload } from "react-icons/md";
import "./App.css"; // Make sure to adjust the CSS for modern styling



function App() {

  const [successMessage, setSuccessMessage] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [faces, setFaces] = useState([]);
  const [selectedFace, setSelectedFace] = useState(null);
  const [personImages, setPersonImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef(null);
  const uploadCancelRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false)
  const [authLoading, setAuthLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [darkMode, setDarkMode] = useState(false); 
  const [errorMessage, setErrorMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Progress state
  const [role, setRole] = useState("");  // Store user role
  const navigate = useNavigate(); // ✅ Use navigate for redirection

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);

      } else {
        setUser(null);
      }
    });
      
    if (personImages.length === 0) {
      setSelectedFace(null); // Clear selected face when no images remain
      console.log("All images deleted, resetting selected face.");
    }
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    }

    

    if (user) {
      setSelectedFace(null); // Clear selected face
      setPersonImages([]); // Clear images of selected person
      fetchAllImages(); // Load all images for the new user
      fetchDetectedFaces(); // Load detected faces for the new user
    }


    
  }, [user]);

  const fetchAllImages = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/get_all_images/", {
        params: { user_id: user.uid }, // Pass user ID
      });
      setUploadedImages(response.data.images || []);
    } catch (error) {
      console.error("Error fetching images", error);
      toast.error("Failed to fetch images.");
    }
  };

  const fetchDetectedFaces = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/get_faces/", {
        params: { user_id: user.uid },
      });
      console.log("Detected Faces Response:", response.data.faces); // Debugging
      setFaces(response.data.faces || []);
    } catch (error) {
      console.error("Error fetching detected faces:", error);
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files); // Get selected files
    setSelectedFiles(files); // Update state with selected files
  };

  const toggleDarkMode = () => {
    setDarkMode((prevMode) => {
      const newMode = !prevMode;
      localStorage.setItem("theme", newMode ? "dark" : "light");
      return newMode;
    });
  };

  const handleRemoveFile = (fileName) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  
    // Reset the file input value to allow re-selecting the same file
    const fileInput = document.getElementById("file-upload");
    if (fileInput) {
      fileInput.value = ""; // Clear the file input value
    }
  };
  const handleCancel = () => {
    setShowCameraModal(true); // Show the custom modal
  };
  
  const confirmCancel = () => {
    setShowCameraModal(false);
    setShowCamera(false); // Hide the camera
  };
  
  const closeModal = () => {
    setShowCameraModal(false); // Close the modal without canceling
  };
  const truncateFileName = (name, length = 15) => {
    const extension = name.split(".").pop(); // Extract the extension
    const baseName = name.substring(0, name.lastIndexOf(".")); // Extract the base file name
    if (baseName.length > length) {
      return `${baseName.substring(0, length)}...${extension}`; // Truncated name with extension
    }
    return name; // Return full name if short
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file.");
      return;
    }
  
    uploadCancelRef.current = false; // Reset cancel flag
    setShowUploadModal(true); // Show upload modal
    setUploading(true); // Start uploading
  
    const userFolder = user.uid; // Fetch user ID
    let uploadedCount = 0; // Counter for uploaded files
    const totalFiles = selectedFiles.length;
  
    try {
      for (const file of selectedFiles) {
        if (uploadCancelRef.current) {
          throw new Error("Upload canceled by user.");
        }
  
        const formData = new FormData();
        formData.append("files", file);
  
        const response = await axios.post("http://127.0.0.1:8000/upload/", formData, {
          params: { user_id: userFolder },
          headers: { "Content-Type": "multipart/form-data" },
        });
  
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
  
        // Dynamically add uploaded image
        setUploadedImages((prevImages) => [
          ...prevImages,
          response.data.imageUrl || URL.createObjectURL(file),
        ]);
  
        // Fetch detected faces dynamically after each upload
        const facesResponse = await axios.get("http://127.0.0.1:8000/get_faces/", {
          params: { user_id: userFolder },
        });
  
        setFaces(facesResponse.data.faces || []); // Update state with detected faces
      }
  
      toast.success("All files uploaded successfully!");
    } catch (error) {
      if (error.message === "Upload canceled by user.") {
        toast.info("Upload canceled.");
      } else {
        console.error("Upload Error:", error);
        toast.error("An error occurred during upload.");
      }
    } finally {
      setUploading(false); // Stop uploading
      setUploadProgress(0); // Reset progress
      setShowUploadModal(false); // Close modal
      setSelectedFiles([]); // Clear selected files after upload
    }
  };
  
  
  
  
  
  
  

  const capturePhoto = async () => {
    const imageSrc = webcamRef.current.getScreenshot(); // Take screenshot
    const res = await fetch(imageSrc); // Convert to blob
    const blob = await res.blob();
    const file = new File([blob], `captured_${Date.now()}.jpg`, { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("files", file);

    try {
      await axios.post("http://127.0.0.1:8000/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        params: { user_id: user.uid },
      });
      toast.success("Upload successful!");
      fetchAllImages(); // Reload images
      fetchDetectedFaces(); // Reload faces
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Upload failed.");
    }
    setShowCamera(false); // Close camera
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prevState) => !prevState); // Toggle password visibility
  };
  
  const handleFaceSelection = async (facePath) => {
    if (selectedFace === facePath) return; // Prevent redundant selection
    setSelectedFace(facePath); // Save the selected face
    setLoading(true); // Show a loading indicator while fetching
    try {
      const response = await axios.get("http://127.0.0.1:8000/get_images/", {
        params: { face: facePath.replace(/\\/g, "/"), user_id: user.uid }, // Fix backslashes
      });
      console.log("Fetched Images:", response.data.images); // Debugging
      setPersonImages(response.data.images || []); // Update state with uploaded images
    } catch (error) {
      console.error("Error fetching images", error);
      toast.error("Failed to fetch images.");
    }
    setLoading(false); // Hide the loading indicator
  };

  const handleLogin = async () => {
        const userData = await signInWithGoogle(); // Firebase auth
        setUser(userData); // Save user object

};

const handleEmailAuth = async () => {
  try {
      if (isSignup) {
          const response = await registerWithEmailPassword(email, password);
          if (response.success) {
              setSuccessMessage(response.message); // Show success message
              setIsSignup(false); // Switch to login mode
              setEmail(""); // Clear email field
              setPassword(""); // Clear password field
          } else {
              setErrorMessage(response.message || "Sign-up failed. Please try again.");
          }
      } else {
          const userData = await loginWithEmailPassword(email, password);

          // Check if userData contains a valid user
          if (userData && userData.success) {
              setUser(userData.user); // Set logged-in user
              setSuccessMessage("Login successful!");
      
          } else {
              setErrorMessage(userData.message || "Invalid credentials. Please try again.");
          }
      }
  } catch (error) {
      console.error("Authentication Error:", error);

      // Handle specific errors
      if (error.code === "auth/user-not-found") {
          setErrorMessage("User not found! Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
          setErrorMessage("Incorrect password. Try again.");
      } else if (error.code === "auth/invalid-credential") {
          setErrorMessage("Invalid email or password.");
      } else {
          setErrorMessage("Something went wrong! Try again.");
      }
  }
};

  const handleForgotPassword = async (email) => {
    if (!email) {
      setErrorMessage("Please enter your email before requesting a password reset.");
      return;
    }

    const auth = getAuth();

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent! Check your inbox.");
      setErrorMessage(""); // Clear previous errors
    } catch (error) {
      console.error("Error sending password reset email:", error);
      setErrorMessage("Failed to send password reset email. Please try again.");
      setSuccessMessage(""); // Clear success message
    }
  };
  const handleDelete = async (imageUrl, filename) => {
    const userId = user.uid; // Fetch current user ID
  
    try {
      // Perform the DELETE request to the backend
      const response = await fetch(
        `http://127.0.0.1:8000/delete_image/?user_id=${userId}&filename=${filename}`,
        { method: "DELETE" }
      );
  
      if (!response.ok) {
        throw new Error(`Failed to delete the image. Status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("Delete Confirmation:", data.message); // Log backend confirmation
  
      // ✅ Update the uploaded images state
      setUploadedImages((prevImages) =>
        prevImages.filter((img) => !img.includes(filename))
      );
  
      // ✅ Display success toast message
      toast.success("Image deleted successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
  
      // Refresh detected faces immediately to reflect changes
      await refreshDetectedFaces(userId);
    } catch (error) {
      console.error("Error deleting image:", error);
  
      // Display error toast message
      toast.error("Failed to delete image. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleDeleteImage = async (image) => {
    try {
      const imageName = image.split("/").pop(); // Extract image filename
      await axios.delete("http://127.0.0.1:8000/delete_image/", {
        params: { user_id: user.uid, filename: imageName },
      });
  
      // Dynamically update images state after deletion
      setUploadedImages((prevImages) =>
        prevImages.filter((img) => img !== image)
      );
  
      toast.success("Image deleted successfully!");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image!");
    }
  };
  
  
  
  // Helper function to refresh detected faces
  const refreshDetectedFaces = async (userId) => {
    try {
      const faceResponse = await fetch(
        `http://127.0.0.1:8000/get_faces/?user_id=${userId}`
      );
  
      if (!faceResponse.ok) {
        throw new Error(`Failed to fetch detected faces. Status: ${faceResponse.status}`);
      }
  
      const faceData = await faceResponse.json();
      setFaces(faceData.faces || []); // Update state with refreshed face data
      console.log("Updated Faces:", faceData.faces);
    } catch (error) {
      console.error("Error refreshing detected faces:", error);
      toast.error("Failed to refresh detected faces!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };
 

  const handleLogout = async () => {
    try {
      // Perform logout logic
      await logout(); 
      setUser(null); // Clear user state
      setSelectedFace(null);
      setPersonImages([]);
  
    } catch (error) {
      console.error("Error during logout:", error);

    }
  };
  
  
  
  

  
  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Welcome to UEM FaceVision</h1>
          <p className="login-description">
            Please sign in to access the Face Detection System.
          </p>

          {/* Email & Password Login - Move this above Google Login */}
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
         <div className="password-container">
  <input
    type={isPasswordVisible ? "text" : "password"} // Toggle between text and password
    placeholder="Enter your password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="password-input"
  />
  <button
    type="button"
    className="toggle-password-inside"
    onClick={togglePasswordVisibility}
  >
    {isPasswordVisible ? <FaEyeSlash /> : <FaEye />} {/* Show/Hide icons */}
  </button>
</div>

          <button
  className="email-login-button"
  onClick={handleEmailAuth}
  disabled={password.length < 6 || !email} // Disable if password is too short or email is empty
>
  {isSignup ? "Sign Up" : "Login"}
</button>
 {/* Forgot Password link only visible in Login mode */}
{!isSignup && (
  <p
    className="forgot-password-text"
    style={{ color: "#007bff", fontWeight: "bold", cursor: "pointer" }}
    onClick={() => handleForgotPassword(email)}
  >
    Forgot Password?
  </p>
)}




          <p className="toggle-text">
            {isSignup ? (
              <>
                <span style={{ color: "black" }}>Already have an account? </span>
                <span
                  className="login-text"
                  style={{ color: "#007bff", fontWeight: "bold", cursor: "pointer" }}
                  onClick={() => setIsSignup(false)}
                >
                  Login
                </span>
              </>
            ) : (
              <>
                <span style={{ color: "black" }}>Don't have an account? </span>
                <span
                  className="signup-text"
                  style={{ color: "#007bff", fontWeight: "bold", cursor: "pointer" }}
                  onClick={() => setIsSignup(true)}
                >
                  Sign up
                </span>
              </>
            )}
          </p>
          {successMessage && <p className="success-message">{successMessage}</p>}
  {errorMessage && <p className="error-message">{errorMessage}</p>}
          <div className="divider">
            <span>or</span>
          </div>
          {/* Google Login Button - Move this below */}
          <button className="google-login-button" onClick={handleLogin}>
            <img src="/img/g.png" alt="Google Icon" className="google-icon" />
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    
    <div className={darkMode ? "app-container dark-mode" : "app-container"}>
    <header className="app-header">
     
    <div className="user-info">
  <img src={user.photoURL || "https://i.pravatar.cc/150"} alt="User Avatar" className="user-avatar" />
  <h3>{user.displayName ? user.displayName : "User"}</h3> {/* Fallback name */}
  <button onClick={handleLogout}>Logout
    </button>

</div>

      <div className="theme-toggle" onClick={toggleDarkMode}>
        {darkMode ? (
          <FaSun size={24} color="#f0f0f0" /> // Sun icon for light mode
        ) : (
          <FaMoon size={24} color="#121212" /> // Moon icon for dark mode
        )}
      </div>
    </header>
    {/* Your other components here */}


  
   

      <h1 className="title">UEM FaceVision : Face Detection System</h1>

      <div className="upload-section">
      <div className="upload-container">
  {/* Left section for file count with remove icon */}
  <div className="file-info">
    {selectedFiles.length > 0 ? (
      <p>
        Selected Files: {selectedFiles.length}
        <button
          className="clear-files-button"
          onClick={() => {
            setSelectedFiles([]);
            const fileInput = document.getElementById("file-upload");
            if (fileInput) fileInput.value = ""; // Reset file input to allow re-selection
          }}
        >
          ❌
        </button>
      </p>
    ) : (
      <p>No files selected</p>
    )}
  </div>

  {/* Right section for the upload button */}
  <div className="upload-main">
    <label htmlFor="file-upload" className="upload-button">
      Choose File
    </label>
    <input
      id="file-upload"
      type="file"
      multiple
      onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
      style={{ display: "none" }}
    />
  </div>
</div>




<button
  onClick={handleUpload}
  disabled={selectedFiles.length === 0} // Disable if no files are selected
  className={selectedFiles.length === 0 ? "upload-button disabled" : "upload-button"}
>
  {uploading ? "Uploading..." : "Upload"}
  {showUploadModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Uploading Files...</h3>
      <progress value={uploadProgress} max="100"></progress>
      <p>{uploadProgress}% Uploaded</p>
      <button
  className="modal-close-button"
  onClick={() => {
    uploadCancelRef.current = true; // Signal cancellation
    setShowUploadModal(false); // Hide the modal
  }}
>
  Close
</button>

    </div>
  </div>
)}


</button>


        <button onClick={() => setShowCamera(!showCamera)}>Open Camera</button>
      </div>

      {showCamera && (
  <div className="camera-container">
    <Webcam ref={webcamRef} screenshotFormat="image/jpeg" mirrored />
    <button className="capture-button" onClick={capturePhoto}>
      Capture
    </button>
    <button className="cancel-button" onClick={handleCancel}>
  Cancel
</button>
  </div>
)}
{showCameraModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      <p>Are you sure you want to cancel?</p>
      <button className="modal-button" onClick={confirmCancel}>
        Yes
      </button>
      <button className="modal-button cancel-modal-button" onClick={closeModal}>
        No
      </button>
    </div>
  </div>
)}


<h2 className="section-title">All Uploaded Images</h2>
<div className="image-grid">
  {uploadedImages.length > 0 ? ( // Check if there are images
    uploadedImages.map((image, index) => {
      const filename = image.split("/").pop(); // Extract file name from URL
      return (
        <div key={index} className="image-item">
          <img src={image} alt="Uploaded" className="uploaded-image" />
          {/* Trash icon appears on hover */}
          <div
            className="delete-icon"
            onClick={() => handleDelete(image, filename)}
          >
            <FaTrash size={15} />
          </div>
        </div>
      );
    })
  ) : (
    <p className="no-images">No uploaded images</p> // Fallback message
  )}
</div>

      <h2 className="section-title">Detected Faces</h2>
      <div className="image-grid">
  {faces.length > 0 ? (
    faces.map((face, index) => (
      <img
        key={index}
        src={face}
        alt="Detected Face"
        className={`detected-face ${selectedFace === face ? "selected" : ""}`}
        onClick={() => handleFaceSelection(face)}
      />
    ))
  ) : (
    <p>No faces detected yet.</p>
  )}
</div>
      <h2 className="section-title">Images of Selected Person</h2>
{loading && <p>Loading images...</p>}
<div className="image-grid">
  {personImages.length > 0 ? ( // Check if there are any images
    personImages.map((image, index) => (
      <div className="image-item" key={index}>
        <img src={image} alt="Person" className="selected-person-image" />
        <div className="hover-overlay">
          <a
            href={image}
            download={`downloaded_image_${index}.jpg`}
            className="download-icon"
          >
            <MdFileDownload size={24} color="#ffffff" />
          </a>
        </div>
      </div>
    ))
  ) : (
    <p className="no-images">No Images of Selected Person</p> // Message when no images are available
  )}
</div>




      <ToastContainer position="top-right" autoClose={3000} />
    </div>

  );
}
export default App;
