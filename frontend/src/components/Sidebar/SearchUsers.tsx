import React, { useState } from 'react';
import client from '../../api/client';
import Avatar from '../UI/Avatar';
import { usePresence } from '../../hooks/usePresence';

interface SearchResult {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
}

interface SearchUsersProps {
  onSelectUser: (userId: string) => void;
}

const SearchUsers: React.FC<SearchUsersProps> = ({ onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { isOnline } = usePresence();

  const handleSearch = async (value: string) => {
    setQuery(value);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await client.get('/users/search', {
        params: { q: value },
      });
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-3">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          id="search-users-input"
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-700/30 rounded-xl text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/40 transition-all"
        />
      </div>

      {results.length > 0 && (
        <div className="mt-2 space-y-1 animate-fade-in">
          {results.map((user) => (
            <button
              key={user.id}
              id={`search-result-${user.id}`}
              onClick={() => {
                onSelectUser(user.id);
                setQuery('');
                setResults([]);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all text-left"
            >
              <Avatar
                name={user.username}
                src={user.avatarUrl}
                size="sm"
                isOnline={isOnline(user.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-100 truncate">
                  {user.username}
                </p>
                <p className="text-xs text-dark-500 truncate">{user.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="mt-3 text-center text-dark-500 text-sm">
          <div className="flex items-center justify-center gap-1">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchUsers;
