import React from 'react';

interface ChatOption {
  label: string;
  value: string;
  action: string;
}

interface InteractiveChatMessageProps {
  message: string;
  options?: ChatOption[];
  onOptionSelect: (option: ChatOption) => void;
  isAi?: boolean;
}

export default function InteractiveChatMessage({
  message,
  options,
  onOptionSelect,
  isAi = true
}: InteractiveChatMessageProps) {
  return (
    <div className={`mb-4 ${isAi ? 'mr-8' : 'ml-8'}`}>
      {/* Message Bubble */}
      <div
        className={`
          p-4 rounded-lg 
          ${isAi 
            ? 'bg-blue-500 text-white rounded-tl-none' 
            : 'bg-gray-200 text-gray-900 rounded-tr-none ml-auto'
          }
        `}
      >
        <p className="text-sm whitespace-pre-wrap">{message}</p>
      </div>

      {/* Clickable Options */}
      {options && options.length > 0 && (
        <div className="mt-3 space-y-2">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => onOptionSelect(option)}
              className="
                w-full p-3 text-left
                bg-white border-2 border-blue-500 
                text-blue-600 font-semibold
                rounded-lg
                hover:bg-blue-50 
                transition-all duration-200
                shadow-sm hover:shadow-md
              "
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

