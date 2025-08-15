import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Briefcase, Search, Star, LoaderCircle, ArrowRight } from 'lucide-react';

// Firebase imports
import { auth, db } from '../firebase';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";


const DashboardCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
    {children}
  </div>
);

const LoadingSkeleton = () => (
    <div className="space-y-8 animate-pulse">
      <DashboardCard>
        <div className="h-6 bg-gray-200 rounded-md w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded-md w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded-md w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
      </DashboardCard>
      <DashboardCard>
        <div className="h-6 bg-gray-200 rounded-md w-1/3 mb-6"></div>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded-md w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded-md w-full"></div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded-md w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded-md w-full"></div>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );


const DashboardScreen = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
  
    // --- Authentication and Data Fetching ---
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          fetchUserDataAndReport(currentUser);
        } else {
          // No user is signed in, redirect to welcome screen
          navigate('/');
        }
      });
  
      // Cleanup subscription on unmount
      return () => unsubscribe();
    }, [navigate]);
  
    const fetchUserDataAndReport = async (currentUser) => {
      setIsLoading(true);
      const userDocRef = doc(db, "users", currentUser.uid);
  
      try {
        const userDocSnap = await getDoc(userDocRef);
  
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          
          // Check if a report already exists
          if (userData.careerReport) {
            setReportData(JSON.parse(userData.careerReport));
          } else if (userData.onboardingData) {
            // No report exists, but we have onboarding data, so generate a new one
            const generatedReport = await generatePersonalizedReport(userData);
            if (generatedReport) {
              setReportData(generatedReport);
              // Save the new report to Firestore for future visits
              await updateDoc(userDocRef, {
                careerReport: JSON.stringify(generatedReport)
              });
            }
          } else {
            // Onboarding not completed
            setError("Please complete the onboarding chat to generate your report.");
          }
        } else {
          // This case might happen if a user is authenticated but their doc doesn't exist
          setError("Could not find user data. Please sign in again.");
        }
      } catch (err) {
        console.error("Error fetching user data or report:", err);
        setError("There was an issue loading your dashboard.");
      } finally {
        setIsLoading(false);
      }
    };
  
    // --- Gemini API Call for the Main Report ---
    const generatePersonalizedReport = async (userData) => {
      setError(null);
  
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setError("API Key is not configured.");
        return null;
      }
  
      // --- UPDATED PROMPT USING ONBOARDING DATA ---
      const masterPrompt = `
        Act as an expert career counselor named Disha. Analyze the following student profile and generate a personalized insight report and career recommendations.
        
        Student Profile:
        - Name: ${userData.displayName || 'the user'}
        - Interests: ${userData.onboardingData.interests}
        - Favorite Subjects: ${userData.onboardingData.subjects}
        - Hobbies: ${userData.onboardingData.hobbies}
  
        Based on this, generate a JSON object with the following structure.
      `;
  
      // Define the JSON schema for a structured response
      const schema = {
        type: "OBJECT",
        properties: {
          personalInsightReport: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              summary: { type: "STRING" },
              strengths: { type: "ARRAY", items: { type: "STRING" } }
            }
          },
          recommendedCareerPaths: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                cluster: { type: "STRING" },
                description: { type: "STRING" }
              }
            }
          }
        }
      };
  
      const payload = {
        contents: [{ role: "user", parts: [{ text: masterPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      };
  
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
  
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const result = await response.json();
        const jsonResponse = JSON.parse(result.candidates[0].content.parts[0].text);
        return jsonResponse;
  
      } catch (err) {
        console.error("Failed to generate report:", err);
        setError("Sorry, we couldn't generate your report right now. Please try again later.");
        return null;
      }
    };

    if (isLoading) {
        return (
          <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
              <LoadingSkeleton />
            </div>
          </div>
        );
      }
    
      if (error) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
              <DashboardCard className="text-center">
                  <h2 className="text-xl font-bold text-red-600">An Error Occurred</h2>
                  <p className="text-gray-600 mt-2">{error}</p>
                  <button onClick={() => fetchUserDataAndReport(user)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                      Retry
                  </button>
              </DashboardCard>
          </div>
        );
      }
    
    
      return (
        <div className="min-h-screen bg-gray-50 font-sans p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800">Your Personalized Dashboard</h1>
                <p className="text-gray-500 mt-1">
                    Welcome, {user?.displayName || 'User'}! Here are insights generated by Disha AI.
                </p>
            </div>
    
            {/* Personal Insight Report Card */}
            {reportData?.personalInsightReport && (
              <DashboardCard>
                <div className="flex items-center mb-4">
                  <BrainCircuit className="w-8 h-8 text-indigo-500 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-800">{reportData.personalInsightReport.title}</h2>
                </div>
                <p className="text-gray-600 mb-4">{reportData.personalInsightReport.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {reportData.personalInsightReport.strengths.map((strength, index) => (
                    <span key={index} className="flex items-center bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 mr-1.5 text-yellow-500" />
                      {strength}
                    </span>
                  ))}
                </div>
              </DashboardCard>
            )}
    
            {/* Recommended Career Paths Card */}
            {reportData?.recommendedCareerPaths && (
              <DashboardCard>
                <div className="flex items-center mb-6">
                  <Briefcase className="w-8 h-8 text-green-500 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-800">Recommended Career Paths</h2>
                </div>
                <ul className="space-y-4">
                  {reportData.recommendedCareerPaths.map((path, index) => (
                    <li 
                      key={index} 
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-md transition cursor-pointer"
                      onClick={() => navigate(`/career/${path.cluster.toLowerCase().replace(/ /g, '-')}`)}
                    >
                      <h3 className="text-lg font-semibold text-gray-800">{path.cluster}</h3>
                      <p className="text-gray-600 text-sm mt-1">{path.description}</p>
                    </li>
                  ))}
                </ul>
              </DashboardCard>
            )}
    
            {/* Future-Proof Me Card */}
            <DashboardCard>
              <div className="flex items-center">
                <Search className="w-8 h-8 text-blue-500 mr-3" />
                <h2 className="text-2xl font-bold text-gray-800">Explore Your Future</h2>
              </div>
              <p className="text-gray-600 my-4">Curious about a specific career? Get AI-powered insights on its future outlook and required skills.</p>
              <div className="flex items-center bg-gray-100 rounded-full p-2 shadow-inner">
                <input type="text" placeholder="e.g., 'Data Scientist' or 'Graphic Designer'" className="flex-grow w-full px-4 py-2 bg-transparent focus:outline-none text-gray-700" />
                <button className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </DashboardCard>
    
          </div>
        </div>
      );
};

export default DashboardScreen;