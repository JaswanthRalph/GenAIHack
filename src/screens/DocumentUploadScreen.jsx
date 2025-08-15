import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, LoaderCircle, ArrowRight, CheckCircle } from 'lucide-react';

// --- Firebase Imports ---
import { auth, db, storage } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// --- Helper Component for Upload Progress ---
const UploadProgressIndicator = ({ fileName, progress }) => (
  <div className="mt-2 text-sm text-gray-600">
    <div className="flex items-center justify-between">
      <p className="truncate w-4/5">{fileName}</p>
      {progress < 100 ? (
        <p>{Math.round(progress)}%</p>
      ) : (
        <CheckCircle className="h-5 w-5 text-green-500" />
      )}
    </div>
    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full ${progress < 100 ? 'bg-indigo-600' : 'bg-green-500'}`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  </div>
);


const DocumentUploadScreen = () => {
  const navigate = useNavigate();
  const resumeInputRef = useRef(null);
  const marksheetInputRef = useRef(null);

  // --- State Management ---
  const [user, setUser] = useState(null);
  const [educationBoard, setEducationBoard] = useState('');
  const [grade, setGrade] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [marksheetFile, setMarksheetFile] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({}); // { resume: 0, marksheet: 100 }
  const [error, setError] = useState('');

  // --- Authentication Effect ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Redirect to login if no user is found
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- File Upload Logic ---
  const handleUpload = async () => {
    if (!user || (!resumeFile && !marksheetFile)) {
      setError('Please select at least one document to upload.');
      return;
    }
    
    setIsUploading(true);
    setError('');
    setUploadProgress({});

    const filesToUpload = [
      { key: 'resume', file: resumeFile },
      { key: 'marksheet', file: marksheetFile }
    ].filter(item => item.file);

    try {
      const uploadedFileUrls = {};

      // Promise-based upload for all selected files
      const uploadPromises = filesToUpload.map(item => {
        return new Promise((resolve, reject) => {
          const storageRef = ref(storage, `users/${user.uid}/documents/${item.key}_${item.file.name}`);
          const uploadTask = uploadBytesResumable(storageRef, item.file);

          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({ ...prev, [item.key]: progress }));
            },
            (error) => {
              console.error(`Upload failed for ${item.key}:`, error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              uploadedFileUrls[item.key] = downloadURL;
              resolve();
            }
          );
        });
      });

      await Promise.all(uploadPromises);

      // --- Save URLs to Firestore ---
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        education: {
          board: educationBoard,
          grade: grade,
        },
        documents: {
          ...uploadedFileUrls
        }
      });
      
      // Navigate to the final step
      navigate('/dashboard');

    } catch (err) {
      console.error("An error occurred during upload or data saving:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  
  const isFormComplete = educationBoard && grade && (resumeFile || marksheetFile);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 font-sans p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in-up">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Upload Documents</h1>
          <p className="text-gray-500 mt-1">Provide your documents for a complete profile.</p>
        </div>
        
        <div className="space-y-6">
          {/* Education Board Dropdown */}
          <div>
            <label htmlFor="board" className="block text-sm font-medium text-gray-700 mb-1">Education Board</label>
            <select
              id="board"
              value={educationBoard}
              onChange={(e) => setEducationBoard(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              disabled={isUploading}
            >
              <option value="" disabled>Select your board</option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="State Board">State Board</option>
              <option value="IB">International Baccalaureate (IB)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Grade Input */}
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">Percentage / CGPA</label>
            <input
              id="grade"
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g., 85.4 or 9.2"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              disabled={isUploading}
            />
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume</label>
            <div
              onClick={() => !isUploading && resumeInputRef.current.click()}
              className={`flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg ${!isUploading && 'cursor-pointer hover:bg-gray-50'} transition`}
            >
              <input type="file" ref={resumeInputRef} onChange={(e) => setResumeFile(e.target.files[0])} className="hidden" accept=".pdf,.doc,.docx" />
              {!resumeFile ? (
                <div className="text-center">
                  <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-1 text-sm text-gray-500">Click to upload (PDF, DOCX)</p>
                </div>
              ) : (
                <UploadProgressIndicator fileName={resumeFile.name} progress={uploadProgress.resume || 0} />
              )}
            </div>
          </div>
          
          {/* Marksheet Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Marksheet</label>
            <div
              onClick={() => !isUploading && marksheetInputRef.current.click()}
              className={`flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg ${!isUploading && 'cursor-pointer hover:bg-gray-50'} transition`}
            >
              <input type="file" ref={marksheetInputRef} onChange={(e) => setMarksheetFile(e.target.files[0])} className="hidden" accept="image/png, image/jpeg, .pdf" />
              {!marksheetFile ? (
                <div className="text-center">
                  <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-1 text-sm text-gray-500">Click to upload (PDF, JPG, PNG)</p>
                </div>
              ) : (
                <UploadProgressIndicator fileName={marksheetFile.name} progress={uploadProgress.marksheet || 0} />
              )}
            </div>
          </div>

        </div>

        {/* Error Message */}
        {error && <p className="text-sm text-red-600 text-center mt-4">{error}</p>}

        {/* Submit Button */}
        <div className="mt-8">
          <button
            onClick={handleUpload}
            disabled={!isFormComplete || isUploading}
            className="w-full flex items-center justify-center px-6 py-3 text-lg font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {isUploading ? <><LoaderCircle className="animate-spin mr-2" /> Uploading...</> : 'Complete Profile'}
            {!isUploading && <ArrowRight className="ml-2" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadScreen;
