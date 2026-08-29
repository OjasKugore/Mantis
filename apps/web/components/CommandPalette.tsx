'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { Search, Bug, Kanban, Plus, LayoutDashboard, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      
      // Global single-key triage shortcuts (only if not focusing an input)
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true';
      if (!isInput && !open) {
        if (e.key === '/') {
          e.preventDefault();
          setOpen(true);
        }
        if (e.key === 'j') {
          // move down list - implemented at list level usually, but we dispatch a custom event
          document.dispatchEvent(new CustomEvent('triage:next'));
        }
        if (e.key === 'k' && !e.metaKey && !e.ctrlKey) {
          // move up list
          document.dispatchEvent(new CustomEvent('triage:prev'));
        }
        if (e.key === 'a') {
          document.dispatchEvent(new CustomEvent('triage:assign'));
        }
        if (e.key === 'c') {
          document.dispatchEvent(new CustomEvent('triage:comment'));
        }
        if (e.key === '?') {
          document.dispatchEvent(new CustomEvent('triage:help'));
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global Command Menu"
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[640px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 z-50 p-0"
      >
        <div className="flex items-center border-b border-gray-200 dark:border-gray-800 px-3">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <Command.Input 
            placeholder="Type a command or search..." 
            className="w-full bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none py-4 text-sm"
          />
        </div>
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-gray-500">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-semibold text-gray-500">
            <Command.Item 
              onSelect={() => runCommand(() => router.push('/'))}
              className="flex items-center px-2 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md cursor-pointer aria-selected:bg-gray-100 aria-selected:dark:bg-gray-800"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => router.push('/bugs/new'))}
              className="flex items-center px-2 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md cursor-pointer aria-selected:bg-gray-100 aria-selected:dark:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" /> File a Bug
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => router.push('/kanban'))}
              className="flex items-center px-2 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md cursor-pointer aria-selected:bg-gray-100 aria-selected:dark:bg-gray-800"
            >
              <Kanban className="w-4 h-4 mr-2" /> Kanban Board
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-semibold text-gray-500">
            <Command.Item 
              value="status:resolved"
              onSelect={() => runCommand(() => document.dispatchEvent(new CustomEvent('action:status', { detail: 'RESOLVED' })))}
              className="flex items-center px-2 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md cursor-pointer aria-selected:bg-gray-100 aria-selected:dark:bg-gray-800"
            >
              <Bug className="w-4 h-4 mr-2" /> Mark current bug as Resolved
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => document.dispatchEvent(new CustomEvent('triage:help')))}
              className="flex items-center px-2 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md cursor-pointer aria-selected:bg-gray-100 aria-selected:dark:bg-gray-800"
            >
              <HelpCircle className="w-4 h-4 mr-2" /> Keyboard Shortcuts Help
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>

      {/* Basic Tailwind CSS for CMDK dialog overlay */}
      <style dangerouslySetInnerHTML={{__html: `
        [cmdk-dialog-overlay] {
          background: rgba(0, 0, 0, 0.4);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          backdrop-filter: blur(2px);
        }
      `}} />
    </>
  );
}
