'use client';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // Light Markdown code block styling
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
    <div className="w-full border border-outline-variant/30 rounded-lg overflow-hidden bg-surface-container-lowest focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all shadow-xs">
      <div className="flex border-b border-outline-variant/20 bg-surface-container-low/40">
        <button
          type="button"
          onClick={() => setActiveTab('write')}
          className={`px-4 py-2 font-body-sm font-medium transition-colors border-r border-outline-variant/20 ${
            activeTab === 'write'
              ? 'bg-surface-container-lowest text-on-surface font-semibold'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 font-body-sm font-medium transition-colors ${
            activeTab === 'preview'
              ? 'bg-surface-container-lowest text-on-surface font-semibold'
              : 'text-on-surface-variant hover:bg-surface-container-high'
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
              className="border-none ring-0 shadow-none focus:ring-0 rounded-none bg-transparent resize-none p-0 min-h-[120px] text-on-surface font-body-sm placeholder:text-on-surface-variant/40"
            />
          </div>
        ) : (
          <div className="p-4 min-h-[152px] prose prose-sm max-w-none text-sm text-on-surface bg-transparent">
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-on-surface-variant/60 italic font-body-sm">Nothing to preview</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-3 border-t border-outline-variant/20 bg-surface-container-low/30">
        <span className="text-[11px] text-on-surface-variant/70 font-body-sm hidden sm:inline-block">
          Markdown is supported. Mentions notify users.
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isSubmitting}
          className="bg-primary text-on-primary px-5 py-1.5 rounded-md font-label-caps text-label-caps uppercase hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-bold"
        >
          {isSubmitting ? 'Posting...' : 'Comment'}
        </button>
      </div>
    </div>
  );
}

