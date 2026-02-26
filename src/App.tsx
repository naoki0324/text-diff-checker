import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import TextAreaWithUpload from '@/components/TextAreaWithUpload';
import DiffViewer from '@/components/DiffViewer';
import { DiffLine } from '@/types';
import { translateText, translateDiff } from '@/lib/gemini';
import './index.css';

const App: React.FC = () => {
  const [textA, setTextA] = useState<string>('');
  const [textB, setTextB] = useState<string>('');
  const [titleA, setTitleA] = useState<string>('変更前');
  const [titleB, setTitleB] = useState<string>('変更後');
  const [diffResult, setDiffResult] = useState<DiffLine[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [noDiff, setNoDiff] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<{ [key: string]: boolean }>({
    'text-a': false,
    'text-b': false,
    'diff': false
  });

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (diffResult && !isLoading && resultsRef.current) {
      // 結果が表示された際に、そのセクション内をスクロール（ボディ全体のスクロールではなく）
    }
  }, [isLoading, diffResult]);


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

  const handleTranslate = async (target: 'text-a' | 'text-b' | 'diff', lang: 'Japanese' | 'English') => {
    setIsTranslating(prev => ({ ...prev, [target]: true }));
    try {
      if (target === 'text-a') {
        const translated = await translateText(textA, lang);
        setTextA(translated);
      } else if (target === 'text-b') {
        const translated = await translateText(textB, lang);
        setTextB(translated);
      } else if (target === 'diff' && diffResult) {
        // DiffLine[] の構造を維持したまま value のみを翻訳
        const values = diffResult.map(line => line.value);
        const translatedValues = await translateDiff(values, lang);
        const newDiffResult = diffResult.map((line, i) => ({
          ...line,
          value: translatedValues[i] || line.value
        }));
        setDiffResult(newDiffResult);
      }
    } catch (error: any) {
      alert(error.message || "その他エラーです");
    } finally {
      setIsTranslating(prev => ({ ...prev, [target]: false }));
    }
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
    <div className="h-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden px-4 sm:px-6">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        <Header />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden mb-4">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4 shrink-0">
            <button
              onClick={handleCompare}
              disabled={isLoading}
              className="px-6 py-2 bg-slate-800 text-white font-semibold rounded-lg shadow-md hover:bg-slate-900 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? '比較中...' : '比較する'}
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg shadow-md hover:bg-slate-300 transition-colors text-sm"
            >
              すべてクリア
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-1/2 min-h-[200px]">
              <TextAreaWithUpload
                id="text-a"
                title={titleA}
                onTitleChange={setTitleA}
                value={textA}
                onValueChange={setTextA}
                onFileSelect={(file) => readFileContent(file, setTextA)}
                placeholder={placeholderTextA}
                onTranslate={(lang) => handleTranslate('text-a', lang)}
                isTranslating={isTranslating['text-a']}
              />
              <TextAreaWithUpload
                id="text-b"
                title={titleB}
                onTitleChange={setTitleB}
                value={textB}
                onValueChange={setTextB}
                onFileSelect={(file) => readFileContent(file, setTextB)}
                placeholder={placeholderTextB}
                onTranslate={(lang) => handleTranslate('text-b', lang)}
                isTranslating={isTranslating['text-b']}
              />
            </div>

            <div ref={resultsRef} className="flex-1 min-h-0 overflow-auto bg-white rounded-xl shadow-inner border border-slate-200">
              {isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 border-4 border-slate-400 border-dashed rounded-full animate-spin"></div>
                  <span className="mt-2">分析中...</span>
                </div>
              )}
              {noDiff && (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-green-800 bg-green-50">
                  <p className="text-lg font-semibold">差は見つかりませんでした！</p>
                  <p className="text-sm opacity-80">2つのテキストは同一です。</p>
                </div>
              )}
              {diffResult && diffResult.length > 0 && (
                <DiffViewer
                  diffResult={diffResult}
                  onTranslate={(lang) => handleTranslate('diff', lang)}
                  isTranslating={isTranslating['diff']}
                />
              )}
              {!isLoading && !noDiff && !diffResult && (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                  比較ボタンを押すとここに結果が表示されます
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
