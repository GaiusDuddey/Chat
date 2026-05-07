import React from 'react';
import ConversationList from '../components/Sidebar/ConversationList';
import ChatWindow from '../components/Chat/ChatWindow';

const Chat: React.FC = () => {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-dark-950 p-4">
      <div className="w-full max-w-7xl h-[calc(100vh-2rem)] flex rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in">
        <ConversationList />
        <ChatWindow />
      </div>
    </div>
  );
};

export default Chat;
