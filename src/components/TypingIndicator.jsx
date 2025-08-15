const TypingIndicator = () => (
    <div className="flex justify-start my-2">
        <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-400 rounded-bl-none animate-fade-in-up">
            <div className="flex items-center justify-center space-x-1">
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce-sm"></span>
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce-sm delay-150"></span>
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce-sm delay-300"></span>
            </div>
        </div>
    </div>
);

export default TypingIndicator;