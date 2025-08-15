import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowRight, Sparkles } from 'lucide-react';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';

const ChatOnboardingScreen = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const conversationStarted = useRef(false);

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [conversationStep, setConversationStep] = useState(0);
  const [isConversationDone, setIsConversationDone] = useState(false);

  const addMessage = (text, sender) => {
    setMessages(prev => [...prev, { text, sender }]);
  };

  const getNextBotMessage = async (currentHistory) => {
    setIsBotTyping(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      addMessage("Error: API Key is not configured.", 'bot');
      setIsBotTyping(false);
      return;
    }

    const systemPrompt = `You are Disha, a friendly and encouraging AI career counselor for a student in India. Your goal is to get to know the user in a conversational way. 
    - Keep your questions short, open-ended, and engaging. 
    - Ask only one question at a time. 
    - After 4-5 questions, naturally conclude the conversation and tell them you're ready to move to the next step.
    - Your first message should always be: "Hi there! I'm Disha, your career guide. To get started, what's your name?"
    - Based on the user's last answer, ask a relevant follow-up question.`;

    const formattedHistory = currentHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const payload = {
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: 'Please ask your next question now.' }] }
      ],
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
      const botResponse = result.candidates[0].content.parts[0].text;
      addMessage(botResponse, 'bot');
      if (botResponse.toLowerCase().includes("next step") || conversationStep > 3) {
        setIsConversationDone(true);
      }
    } catch (error) {
      console.error("Gemini API call failed:", error);
      addMessage("Sorry, I'm having a little trouble connecting. Let's try again in a moment.", 'bot');
    } finally {
      setIsBotTyping(false);
    }
  };

  // FIX: This effect now uses a ref to ensure it only runs once on mount.
  useEffect(() => {
    if (!conversationStarted.current) {
      conversationStarted.current = true;
      getNextBotMessage([]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (userInput.trim() === '' || isBotTyping) return;
    const newUserMessage = { text: userInput, sender: 'user' };
    const newHistory = [...messages, newUserMessage];
    setMessages(newHistory);
    setUserInput('');
    setConversationStep(prev => prev + 1);
    getNextBotMessage(newHistory);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  // --- UI RENDER ---
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 font-sans p-4">
      {/* UI CHANGE: Main chat container with a card-like appearance */}
      <div className="flex flex-col w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <Sparkles className="text-indigo-500 mr-3" size={24} />
            <h1 className="text-xl font-bold text-gray-800">Disha AI Onboarding</h1>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">
          {messages.map((msg, index) => (
            <ChatBubble key={index} message={msg.text} sender={msg.sender} />
          ))}
          {isBotTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          {isConversationDone && !isBotTyping ? (
              <button 
                  onClick={() => navigate('/onboarding/upload')}
                  className="flex items-center justify-center w-full px-6 py-3 text-lg font-semibold text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all transform hover:scale-105 animate-fade-in-up"
              >
                  Next: Upload Documents <ArrowRight className="ml-2" />
              </button>
          ) : (
              // UI CHANGE: Redesigned input field
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