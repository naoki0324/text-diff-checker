import React from 'react';
import { DiffLine } from '../types';

interface DiffViewerProps {
  diffResult: DiffLine[];
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diffResult }) => {

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
    <div className="w-full mt-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800">比較結果</h3>
        </div>
      <pre className="p-4 text-base font-sans text-slate-700 whitespace-pre-wrap break-words"><code>
        {diffResult.map((line, index) => (
          <div key={index} className={`flex ${getLineClasses(line.type)}`}>
            <span className={`w-6 text-center select-none flex-shrink-0 ${getOperatorClasses(line.type)}`}>
              {getOperator(line.type)}
            </span>
            <span className="flex-grow">{line.value}</span>
          </div>
        ))}
      </code></pre>
    </div>
  );
};

export default DiffViewer;