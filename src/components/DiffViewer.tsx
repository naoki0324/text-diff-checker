import React from 'react';
import { DiffLine } from '@/types';

interface DiffViewerProps {
  diffResult: DiffLine[];
  onTranslate: (lang: 'Japanese' | 'English') => void;
  isTranslating: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diffResult, onTranslate, isTranslating }) => {

  const getLineClasses = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-100';
      case 'removed':
        return 'bg-red-100';
      default:
        return 'bg-transparent';
    }
  };

  const getOperatorClasses = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return 'text-green-600';
      case 'removed':
        return 'text-red-600';
      default:
        return 'text-slate-400';
    }
  };

  const getOperator = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      default:
        return ' ';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="p-3 border-b border-slate-200 flex justify-between items-center shrink-0">
        <h3 className="text-base font-semibold text-slate-800">比較結果</h3>
        <div className="flex items-center gap-2">
          {isTranslating && <span className="text-xs text-slate-400 animate-pulse">翻訳中...</span>}
          <button
            onClick={() => onTranslate('Japanese')}
            disabled={isTranslating}
            className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-50"
          >
            和訳
          </button>
          <button
            onClick={() => onTranslate('English')}
            disabled={isTranslating}
            className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-50"
          >
            英訳
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 text-sm font-sans text-slate-700 whitespace-pre-wrap break-words">
        {diffResult.map((line, index) => (
          <div key={index} className={`flex ${getLineClasses(line.type)}`}>
            <span className={`w-6 text-center select-none flex-shrink-0 ${getOperatorClasses(line.type)}`}>
              {getOperator(line.type)}
            </span>
            <span className="flex-grow">{line.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiffViewer;