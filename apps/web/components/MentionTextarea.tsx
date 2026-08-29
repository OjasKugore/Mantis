'use client';
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

export interface UserMention {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MentionTextarea({ value, onChange, placeholder, className = '' }: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [suggestions, setSuggestions] = useState<UserMention[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced user search
  useEffect(() => {
    if (!showDropdown || searchQuery.length === 0) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.users || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Failed to fetch user mentions', err);
      }
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, showDropdown]);

  const insertMention = (user: UserMention) => {
    if (!textareaRef.current) return;
    const text = value;
    const cursor = textareaRef.current.selectionStart;
    
    // Find where the '@' was typed
    const beforeCursor = text.substring(0, cursor);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const newText = text.substring(0, atIndex) + `@${user.username} ` + text.substring(cursor);
      onChange(newText);
      setShowDropdown(false);
      setSearchQuery('');
      
      // Restore focus
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursor = atIndex + user.username.length + 2;
          textareaRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursor = e.target.selectionStart;
    const beforeCursor = val.substring(0, cursor);
    
    // Regex to match an @ symbol followed by word characters right before cursor
    const match = beforeCursor.match(/@(\w*)$/);
    if (match) {
      setShowDropdown(true);
      setSearchQuery(match[1]);
      
      // Very basic positioning estimate (a robust app might use getCaretCoordinates package)
      setDropdownPos({ top: 30, left: 10 });
    } else {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 ${className}`}
        rows={4}
      />
      {showDropdown && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg overflow-hidden"
          style={{ top: '100%', left: 0 }}
        >
          <ul className="max-h-48 overflow-y-auto">
            {suggestions.map((user, idx) => (
              <li
                key={user.id}
                onClick={() => insertMention(user)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${
                  idx === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold">{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{user.username}</span>
                  <span className="text-xs opacity-75">{user.display_name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
