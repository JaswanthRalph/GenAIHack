import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowRight, Sparkles, LoaderCircle } from 'lucide-react';

// Firebase imports
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';

const ChatOnboardingScreen = () => {
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const conversationStarted = useRef(false);
  
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [isConversationDone, setIsConversationDone] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // State for saving process
  
    // --- Authentication ---
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
        } else {
          navigate('/'); // Redirect if not logged in
        }
      });
      return () => unsubscribe();
    }, [navigate]);
  
    // --- Initial Bot Message ---
    useEffect(() => {
      // Start the conversation only once when the user is authenticated
      if (user && !conversationStarted.current) {
        conversationStarted.current = true;
        // The first message is now static to ensure it always starts correctly
        addMessage(`Hi there! I'm Disha, your career guide. To get started, what's your name and what are you currently studying?`, 'bot');
      }
    }, [user]); // Dependency on user ensures it runs after user is set
  
    // --- Scroll to Bottom ---
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
  
    const addMessage = (text, sender) => {
      setMessages(prev => [...prev, { text, sender }]);
    };
  
    // --- Gemini API Call for Conversation ---
    const getNextBotMessage = async (currentHistory) => {
      setIsBotTyping(true);
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        addMessage("Error: API Key is not configured.", 'bot');
        setIsBotTyping(false);
        return;
      }
  
      const conversationLength = currentHistory.filter(m => m.sender === 'user').length;
  
      // --- UPDATED SYSTEM PROMPT ---
      // This new prompt guides the AI to summarize the conversation at the end.
      const systemPrompt = `You are Disha, a friendly AI career counselor. Your goal is to understand a student's interests, favorite subjects, and hobbies.
      - Ask short, engaging, open-ended questions, one at a time.
      - Your first message is fixed. Start by asking about their favorite subjects.
      - Then ask about their hobbies and interests.
      - After 3-4 questions, you MUST conclude.
      - **Crucially, your final message must follow this JSON format and nothing else:**
        {
          "summary": "A friendly concluding message for the user, like 'Thanks for sharing! I have a better idea of your interests now. Let's move to the next step.'",
          "data": {
            "interests": "A summary of the user's stated interests.",
            "subjects": "A summary of the user's favorite subjects.",
            "hobbies": "A summary of the user's hobbies."
          }
        }`;
  
      const formattedHistory = currentHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
  
      const payload = {
        contents: formattedHistory,
        systemInstruction: { role: 'model', parts: [{ text: systemPrompt }] }
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
        const botResponseText = result.candidates[0].content.parts[0].text;
  
        // Check if the response is the final JSON object
        if (botResponseText.includes('{"summary"')) {
          const jsonData = JSON.parse(botResponseText);
          addMessage(jsonData.summary, 'bot');
          await saveOnboardingData(jsonData.data); // Save the extracted data
          setIsConversationDone(true);
        } else {
          addMessage(botResponseText, 'bot');
        }
  
      } catch (error) {
        console.error("Gemini API call failed:", error);
        addMessage("Sorry, I'm having a little trouble. Let's move to the next step.", 'bot');
        setIsConversationDone(true); // Fail gracefully to unblock the user
      } finally {
        setIsBotTyping(false);
      }
    };
  
    // --- Save Data to Firestore ---
    const saveOnboardingData = async (data) => {
      if (!user) return;
      setIsSaving(true);
      const userDocRef = doc(db, "users", user.uid);
      try {
        await updateDoc(userDocRef, {
          onboardingData: data, // Save the structured data
          onboardingCompletedAt: new Date()
        });
        // The button will appear automatically as isConversationDone is true
      } catch (error) {
        console.error("Failed to save user data:", error);
        addMessage("There was an error saving your info. But don't worry, you can proceed.", 'bot');
      } finally {
        setIsSaving(false);
      }
    };
  
    const handleSend = () => {
      if (userInput.trim() === '' || isBotTyping) return;
      const newUserMessage = { text: userInput, sender: 'user' };
      const newHistory = [...messages, newUserMessage];
      setMessages(newHistory);
      setUserInput('');
      getNextBotMessage(newHistory);
    };
  
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') handleSend();
    };
  
    // --- UI RENDER ---
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 font-sans p-4">
          <div className="flex flex-col w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
            
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center">
                <Sparkles className="text-indigo-500 mr-3" size={24} />
                <h1 className="text-xl font-bold text-gray-800">Disha AI Onboarding</h1>
              </div>
            </div>
    
            <div className="flex-grow p-4 md:p-6 overflow-y-auto">
              {messages.map((msg, index) => (
                <ChatBubble key={index} message={msg.text} sender={msg.sender} />
              ))}
              {isBotTyping && <TypingIndicator />}
              {isSaving && (
                <div className="flex items-center justify-center text-gray-500 text-sm">
                  <LoaderCircle className="animate-spin w-4 h-4 mr-2" />
                  Saving your responses...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 bg-white border-t border-gray-200">
              {isConversationDone ? (
                  <button 
                      onClick={() => navigate('/dashboard')}
                      className="flex items-center justify-center w-full px-6 py-3 text-lg font-semibold text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all transform hover:scale-105 animate-fade-in-up"
                      disabled={isSaving}
                  >
                      {isSaving ? 'Finalizing...' : 'Go to Dashboard'}
                      {!isSaving && <ArrowRight className="ml-2" />}
                  </button>
              ) : (
                  <div className="flex items-center bg-gray-100 rounded-full p-2 shadow-inner">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isBotTyping ? "Disha is typing..." : "Type your answer..."}
                        className="flex-grow w-full px-4 py-2 bg-transparent focus:outline-none text-gray-700"
                        disabled={isBotTyping}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isBotTyping || userInput.trim() === ''}
                        className="p-3 bg-indigo-600 text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                  </div>
              )}
            </div>
          </div>
        </div>
      );
};

export default ChatOnboardingScreen;
