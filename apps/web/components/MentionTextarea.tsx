'use client';
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

export interface UserMention {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

const FALLBACK_USERS: UserMention[] = [
  { id: '1', username: 'admin', display_name: 'System Administrator' },
  { id: '2', username: 'alice', display_name: 'Alice Developer' },
  { id: '3', username: 'bob', display_name: 'Bob QA Engineer' },
  { id: '4', username: 'carol', display_name: 'Carol Security Lead' },
  { id: '5', username: 'eve', display_name: 'Eve Triage Coordinator' },
];

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MentionTextarea({ value, onChange, placeholder, className = '' }: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserMention[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch users when dropdown opens or searchQuery changes
  useEffect(() => {
    if (!showDropdown) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.users && data.users.length > 0) {
            setSuggestions(data.users);
          } else {
            // Filter fallbacks if backend returned empty
            const filtered = FALLBACK_USERS.filter(
              (u) =>
                u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSuggestions(filtered);
          }
          setSelectedIndex(0);
        } else {
          // Fallback
          const filtered = FALLBACK_USERS.filter(
            (u) =>
              u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSuggestions(filtered);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Failed to fetch user mentions', err);
        const filtered = FALLBACK_USERS.filter(
          (u) =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSuggestions(filtered);
      } finally {
        setLoading(false);
      }
    }, searchQuery ? 120 : 0);

    return () => clearTimeout(timer);
  }, [searchQuery, showDropdown]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      // Restore focus and cursor position
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

    // Match an @ symbol followed by zero or more word characters at the cursor
    const match = beforeCursor.match(/@(\w*)$/);
    if (match) {
      setShowDropdown(true);
      setSearchQuery(match[1]);
    } else {
      setShowDropdown(false);
      setSearchQuery('');
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
        className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-primary/40 focus:outline-none bg-surface-container-lowest border-outline-variant/30 text-on-surface ${className}`}
        rows={4}
      />
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bottom-full mb-1 left-0 w-72 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-2 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant font-label-caps uppercase tracking-wider font-semibold">
            <span>Mention Collaborator</span>
            {loading && <span className="animate-spin text-xs">⏳</span>}
          </div>
          <ul className="max-h-52 overflow-y-auto divide-y divide-outline-variant/10">
            {suggestions.length > 0 ? (
              suggestions.map((user, idx) => (
                <li
                  key={user.id || user.username}
                  onClick={() => insertMention(user)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 cursor-pointer flex items-center gap-3 transition-colors ${
                    idx === selectedIndex
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold overflow-hidden flex-shrink-0 flex items-center justify-center text-xs">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-semibold text-primary">@{user.username}</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant truncate">{user.display_name}</span>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-xs text-on-surface-variant/70 italic text-center">
                {loading ? 'Searching users...' : 'No users found matching query'}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
