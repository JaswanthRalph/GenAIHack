import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, LoaderCircle, ArrowRight, Lightbulb } from 'lucide-react';

const DocumentUploadScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State for form inputs
  const [educationBoard, setEducationBoard] = useState('');
  const [grade, setGrade] = useState('');
  const [marksheetFile, setMarksheetFile] = useState(null);
  const [fileName, setFileName] = useState('');
  
  // State for Gemini AI feature
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('');

  // Gemini API Call for Image Parsing
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setMarksheetFile(file);
      setFileName(file.name);
      parseMarksheetWithGemini(file);
    }
  };

  const parseMarksheetWithGemini = async (file) => {
    setIsParsing(true);
    setParsingStatus('Uploading and analyzing your marksheet...');
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setParsingStatus('Error: API Key is not configured.');
      setIsParsing(false);
      return;
    }

    // Convert image to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64ImageData = reader.result.split(',')[1];

      const prompt = "Analyze this image of a student's marksheet. Identify and extract the final percentage or CGPA. Return only the numerical value (e.g., '85.4' or '9.2'). If you cannot find a clear final grade, return 'Not Found'.";

      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: file.type, data: base64ImageData } }
          ]
        }]
      };

      try {
        setParsingStatus('Extracting grades with AI...');
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const result = await response.json();
        const extractedGrade = result.candidates[0].content.parts[0].text;

        if (extractedGrade && !extractedGrade.toLowerCase().includes('not found')) {
          setGrade(extractedGrade.trim());
          setParsingStatus('Successfully extracted your grade!');
        } else {
          setParsingStatus("Couldn't automatically find a grade. Please enter it manually.");
        }
      } catch (error) {
        console.error("Gemini image parsing failed:", error);
        setParsingStatus("Analysis failed. Please enter your grade manually.");
      } finally {
        setIsParsing(false);
      }
    };
  };

  const isFormComplete = educationBoard && grade && marksheetFile;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 font-sans p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in-up">
        
        {/* Header and Progress Bar */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Academic Details</h1>
          <p className="text-gray-500 mt-1">Complete your profile to get personalized insights.</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '66%' }}></div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Education Board Dropdown */}
          <div>
            <label htmlFor="board" className="block text-sm font-medium text-gray-700 mb-1">Education Board</label>
            <select
              id="board"
              value={educationBoard}
              onChange={(e) => setEducationBoard(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="" disabled>Select your board</option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="State Board">State Board</option>
              <option value="IB">International Baccalaureate (IB)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Marksheet Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Marksheet</label>
            <div
              onClick={() => fileInputRef.current.click()}
              className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
              />
              {fileName ? (
                <div className="text-center">
                  <FileText className="mx-auto h-10 w-10 text-green-500" />
                  <p className="mt-2 text-sm text-gray-600 font-semibold">{fileName}</p>
                </div>
              ) : (
                <div className="text-center">
                  <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG or WEBP</p>
                </div>
              )}
            </div>
          </div>

          {/* Grade Input with AI Status */}
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">Percentage / CGPA</label>
            <div className="relative">
              <input
                id="grade"
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g., 85.4 or 9.2"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              {isParsing && <LoaderCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500 animate-spin" />}
            </div>
            {parsingStatus && (
              <p className="flex items-center text-xs text-gray-500 mt-2">
                <Lightbulb className="h-4 w-4 mr-1.5 text-yellow-500 flex-shrink-0" />
                {parsingStatus}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <button
            onClick={() => navigate('/dashboard')} // Navigate to dashboard on completion
            disabled={!isFormComplete}
            className="w-full flex items-center justify-center px-6 py-3 text-lg font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            Complete Profile <ArrowRight className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadScreen;
