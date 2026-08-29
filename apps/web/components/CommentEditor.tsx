'use client';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; // Markdown code block styling
import { MentionTextarea } from './MentionTextarea';

interface CommentEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function CommentEditor({ value, onChange, onSubmit, isSubmitting = false }: CommentEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  return (
    <div className="w-full border rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
        <button
          type="button"
          onClick={() => setActiveTab('write')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors mr-2 ${
            activeTab === 'write'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'preview'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Preview
        </button>
      </div>

      <div className="p-0">
        {activeTab === 'write' ? (
          <div className="p-4">
            <MentionTextarea
              value={value}
              onChange={onChange}
              placeholder="Leave a comment... Type @ to mention someone"
              className="border-none ring-0 shadow-none focus:ring-0 rounded-none bg-transparent resize-none p-0 min-h-[120px]"
            />
          </div>
        ) : (
          <div className="p-4 min-h-[152px] prose dark:prose-invert max-w-none text-sm bg-transparent">
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-gray-400 italic">Nothing to preview</span>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end items-center p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <span className="text-xs text-gray-400 mr-4 hidden sm:inline-block">Markdown is supported. Mentions notify users.</span>
        <button
          onClick={onSubmit}
          disabled={!value.trim() || isSubmitting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
        >
          {isSubmitting ? 'Commenting...' : 'Comment'}
        </button>
      </div>
    </div>
  );
}
