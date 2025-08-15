import React, { useState } from 'react';
import { Mail, X, Sparkles, LoaderCircle } from 'lucide-react';

import GoogleIcon from '../components/GoogleIcon';

const GeminiPitchModal = ({ isOpen, onClose, pitch, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        <div className="flex items-center mb-4">
          <Sparkles className="text-yellow-500 mr-3" size={32} />
          <h2 className="text-2xl font-bold text-gray-800">Why Disha AI?</h2>
        </div>
        <div className="text-gray-600 text-lg min-h-[100px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoaderCircle className="animate-spin text-indigo-500" size={40} />
            </div>
          ) : (
            <p>{pitch}</p>
          )}
        </div>
      </div>
    </div>
  );
};


const WelcomeScreen = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Function to call the Gemini API
  const handleGeneratePitch = async () => {
    setIsModalOpen(true);
    setIsLoading(true);
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        setGeneratedPitch("API Key is not configured. Please set up your .env file.");
        setIsLoading(false);
        return;
    }

    const prompt = "You are an expert career counselor. Write a short, encouraging, and compelling paragraph (around 50-60 words) for a student who has just landed on the welcome screen of 'Disha AI'. Explain why using a personalized, AI-powered career navigator is a game-changer for their future. Focus on clarity, confidence, and discovering their unique path.";

    try {
      let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts[0].text) {
        setGeneratedPitch(result.candidates[0].content.parts[0].text);
      } else {
        setGeneratedPitch("Couldn't generate a pitch right now. But trust us, it's a great tool for your future!");
      }
    } catch (error) {
      console.error("Gemini API call error:", error);
      setGeneratedPitch("There was an issue connecting to our AI. Please check your API key and network connection.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <GeminiPitchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        pitch={generatedPitch}
        isLoading={isLoading}
      />
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans">
        <div className="w-full max-w-md mx-auto text-center animate-fade-in-up">
          
          {/* Logo and App Name */}
          <div className="mb-8">
            <div className="inline-block p-4 bg-white rounded-full shadow-lg">
              <svg className="w-16 h-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="mt-4 text-4xl font-bold text-gray-800">Disha AI</h1>
          </div>
          
          {/* Tagline */}
          <p className="mb-12 text-lg text-gray-600 md:text-xl">
            Your Personalized Career Navigator.
          </p>
          
          {/* Call to Action Buttons */}
          <div className="space-y-4">
            <button className="flex items-center justify-center w-full px-6 py-3 text-lg font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105">
              <GoogleIcon />
              <span className="ml-4">Continue with Google</span>
            </button>
            
            <button className="flex items-center justify-center w-full px-6 py-3 text-lg font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105">
              <Mail className="w-6 h-6" />
              <span className="ml-4">Continue with Email</span>
            </button>
          </div>

          {/* Gemini-powered Feature Button */}
          <div className="mt-8">
            <button 
              onClick={handleGeneratePitch}
              className="flex items-center justify-center w-full px-6 py-3 text-lg font-semibold text-indigo-700 bg-indigo-100 border border-transparent rounded-lg hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-105"
            >
              <Sparkles className="w-6 h-6 mr-3 text-yellow-500" />
              Why Choose Disha AI?
            </button>
          </div>

          {/* Terms and Conditions */}
          <div className="mt-12 text-center">
              <p className="text-sm text-gray-500">
                  By continuing, you agree to Disha AI's <br />
                  <a href="#" className="font-medium text-indigo-600 hover:underline">Terms of Service</a> and <a href="#" className="font-medium text-indigo-600 hover:underline">Privacy Policy</a>.
              </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default WelcomeScreen;