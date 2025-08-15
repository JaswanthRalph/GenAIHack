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
    const [isSaving, setIsSaving] = useState(false);
  
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
      if (user && !conversationStarted.current) {
        conversationStarted.current = true;
        addMessage(`Hi there! I'm Disha, your career guide. To get started, what's your name and what are you currently studying?`, 'bot');
      }
    }, [user]);
  
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
  
      const systemPrompt = `You are Disha, a friendly AI career counselor. Your goal is to understand a student's interests, favorite subjects, and hobbies.
      - Ask short, engaging, open-ended questions, one at a time.
      - After 3-4 questions, you MUST conclude.
      - Your final message must follow this JSON format and nothing else:
        {
          "summary": "A friendly concluding message for the user.",
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
  
        // --- ROBUST JSON PARSING ---
        // Try to find and parse the JSON block from the response
        const jsonMatch = botResponseText.match(/{[\s\S]*}/);
        if (jsonMatch) {
          try {
            const jsonData = JSON.parse(jsonMatch[0]);
            if (jsonData.summary && jsonData.data) {
              // It's the final message. Display summary, save data, and end conversation.
              addMessage(jsonData.summary, 'bot');
              setIsConversationDone(true); // Disable input immediately
              await saveOnboardingData(jsonData.data);
              
              // Navigate after a short delay
              setTimeout(() => {
                navigate('/document-upload');
              }, 2500);
              return; // Stop further processing
            }
          } catch (e) {
            // It looked like JSON, but wasn't valid. Fall through and treat as a normal message.
            console.error("Failed to parse JSON from bot response:", e);
          }
        }
        
        // If it's a regular message (or JSON parsing failed), just add it to the chat
        addMessage(botResponseText, 'bot');
  
      } catch (error) {
        console.error("Gemini API call failed:", error);
        addMessage("Sorry, I'm having a little trouble. Let's move to the next step.", 'bot');
        setIsConversationDone(true);
        setTimeout(() => navigate('/document-upload'), 2500);
      } finally {
        setIsBotTyping(false);
      }
    };
  
    const saveOnboardingData = async (data) => {
      if (!user) return;
      setIsSaving(true);
      const userDocRef = doc(db, "users", user.uid);
      try {
        await updateDoc(userDocRef, {
          onboardingData: data,
          onboardingCompletedAt: new Date()
        });
      } catch (error) {
        console.error("Failed to save user data:", error);
        addMessage("There was an error saving your info, but we can continue.", 'bot');
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
  
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 font-sans p-4">
        <div className="flex flex-col w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
          
          <div className="p-4 border-b border-gray-200 flex items-center">
            <Sparkles className="text-indigo-500 mr-3" size={24} />
            <h1 className="text-xl font-bold text-gray-800">Disha AI Onboarding</h1>
          </div>
  
          <div className="flex-grow p-4 md:p-6 overflow-y-auto">
            {messages.map((msg, index) => (
              <ChatBubble key={index} message={msg.text} sender={msg.sender} />
            ))}
            {isBotTyping && <TypingIndicator />}
            {isSaving && (
              <div className="flex items-center justify-center text-gray-500 text-sm my-2">
                <LoaderCircle className="animate-spin w-4 h-4 mr-2" />
                Saving your responses...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 bg-white border-t border-gray-200">
            {isConversationDone ? (
                <div className="text-center text-gray-600 font-medium animate-pulse">
                  Redirecting to the next step...
                </div>
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
