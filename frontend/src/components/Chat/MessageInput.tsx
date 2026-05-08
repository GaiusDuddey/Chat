import React, { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onFileUpload?: (file: File) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTypingStart,
  onTypingStop,
  onFileUpload,
}) => {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Handle typing indicator
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop();
    }, 2000);
  };

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setMessage('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop();
    }
  }, [message, onSend, onTypingStop]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="px-4 py-3 border-t border-dark-700/30">
      <div className="flex items-end gap-2">
        {/* File attachment button */}
        <button
          id="attach-file-button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-ghost p-2.5 rounded-xl shrink-0 mb-0.5"
          title="Attach file"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            id="message-input"
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full px-4 py-2.5 bg-dark-800/60 border border-dark-700/30 rounded-xl text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/40 transition-all resize-none max-h-32 overflow-y-auto"
            style={{ minHeight: '42px' }}
          />
        </div>

        {/* Send button */}
        <button
          id="send-message-button"
          onClick={handleSend}
          disabled={!message.trim()}
          className={`p-2.5 rounded-xl shrink-0 mb-0.5 transition-all duration-200 ${message.trim()
              ? 'gradient-primary text-white shadow-lg shadow-primary-500/20 hover:opacity-90 active:scale-95'
              : 'bg-dark-800/50 text-dark-600 cursor-not-allowed'
            }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
