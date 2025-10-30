import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header';
import TextAreaWithUpload from './components/TextAreaWithUpload';
import DiffViewer from './components/DiffViewer';
import { DiffLine } from './types';

const App: React.FC = () => {
  const [textA, setTextA] = useState<string>('');
  const [textB, setTextB] = useState<string>('');
  const [titleA, setTitleA] = useState<string>('変更前');
  const [titleB, setTitleB] = useState<string>('変更後');
  const [diffResult, setDiffResult] = useState<DiffLine[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [noDiff, setNoDiff] = useState<boolean>(false);
  const [comparisonStarted, setComparisonStarted] = useState<boolean>(false);
  
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (comparisonStarted && !isLoading && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setComparisonStarted(false);
    }
  }, [isLoading, comparisonStarted]);


  const readFileContent = (file: File, setter: (content: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setter(content);
    };
    reader.onerror = (e) => {
      console.error("Error reading file:", e);
      alert("ファイルの読み込みに失敗しました。");
    };
    reader.readAsText(file);
  };
  
  const generateDiff = useCallback((text1: string, text2: string): DiffLine[] => {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const n = lines1.length;
    const m = lines2.length;

    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (lines1[i - 1] === lines2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    const result: DiffLine[] = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
            result.unshift({ type: 'common', value: lines1[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'added', value: lines2[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            result.unshift({ type: 'removed', value: lines1[i - 1] });
            i--;
        } else {
            break;
        }
    }
    return result;
  }, []);

  const handleCompare = useCallback(() => {
    setNoDiff(false);
    setIsLoading(true);
    setDiffResult(null);
    setComparisonStarted(true);

    // Allow UI to update before heavy computation
    setTimeout(() => {
      if (textA === textB) {
        setNoDiff(true);
        setDiffResult([]);
        setIsLoading(false);
        return;
      }
      const result = generateDiff(textA, textB);
      setDiffResult(result);
      setIsLoading(false);
    }, 50);
  }, [textA, textB, generateDiff]);

  const handleClear = () => {
    setTextA('');
    setTextB('');
    setTitleA('変更前');
    setTitleB('変更後');
    setDiffResult(null);
    setNoDiff(false);
  };
  
  const placeholderTextA = `元のテキストをここに貼り付けるか、ファイルをアップロードしてください。
例:
- React
- Vue
- Svelte
`;
  const placeholderTextB = `変更後のテキストをここに貼り付けるか、ファイルをアップロードしてください。
例:
- React
- Angular
- Svelte
- Solid
`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        <main>
          <div className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm py-4 mb-6">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleCompare}
                disabled={isLoading}
                className="w-full sm:w-auto px-8 py-3 bg-slate-800 text-white font-semibold rounded-lg shadow-md hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    比較中...
                  </div>
                ) : '比較する'}
              </button>
              <button
                onClick={handleClear}
                className="w-full sm:w-auto px-8 py-3 bg-slate-200 text-slate-800 font-semibold rounded-lg shadow-md hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
              >
                すべてクリア
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 h-[400px] md:h-[500px]">
              <div className="w-full md:w-1/2 h-full">
                <TextAreaWithUpload
                  id="text-a"
                  title={titleA}
                  onTitleChange={setTitleA}
                  value={textA}
                  onValueChange={setTextA}
                  onFileSelect={(file) => readFileContent(file, setTextA)}
                  placeholder={placeholderTextA}
                />
              </div>
              <div className="w-full md:w-1/2 h-full">
                <TextAreaWithUpload
                  id="text-b"
                  title={titleB}
                  onTitleChange={setTitleB}
                  value={textB}
                  onValueChange={setTextB}
                  onFileSelect={(file) => readFileContent(file, setTextB)}
                  placeholder={placeholderTextB}
                />
              </div>
            </div>
          </div>
          
          <div ref={resultsRef} className="pb-12 scroll-mt-24">
            {isLoading && (
                 <div className="mt-8 text-center text-slate-500 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-slate-400 border-dashed rounded-full animate-spin"></div>
                    <span className="ml-4 text-lg">差分を分析中...</span>
                 </div>
            )}
            {noDiff && (
                <div className="mt-8 p-6 text-center bg-green-100 border border-green-300 rounded-lg">
                    <p className="text-xl font-semibold text-green-800">差は見つかりませんでした！</p>
                    <p className="text-slate-600">2つのテキストは同一です。</p>
                </div>
            )}
            {diffResult && diffResult.length > 0 && <DiffViewer diffResult={diffResult} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
