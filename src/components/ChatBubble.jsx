const ChatBubble = ({ message, sender }) => {
  const isUser = sender === 'user';
  return (
    <div className={`flex items-end my-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`px-4 py-2 rounded-2xl max-w-xs md:max-w-md animate-fade-in-up ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        {message}
      </div>
    </div>
  );
};

export default ChatBubble;