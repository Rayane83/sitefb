// Test helper hook to add clipboard paste functionality
import { useState } from 'react';
import { parseClipboardDotationData } from '@/lib/export';
import type { DotationRow } from '@/lib/types';

export function useClipboardPaste(onDataParsed: (rows: Partial<DotationRow>[]) => void) {
  const [pasteValue, setPasteValue] = useState('');

  const handlePaste = (text: string) => {
    setPasteValue(text);
    if (text.trim()) {
      const parsedRows = parseClipboardDotationData(text);
      onDataParsed(parsedRows);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'v') {
      // Handle paste
      navigator.clipboard.readText().then(text => {
        handlePaste(text);
      }).catch(() => {
        // Fallback to manual input
      });
    }
  };

  return {
    pasteValue,
    setPasteValue,
    handlePaste,
    handleKeyDown
  };
}