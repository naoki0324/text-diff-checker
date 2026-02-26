import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
    // Vite 標準の環境変数アクセス方法
    return (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
};

export const translateText = async (text: string, targetLang: 'Japanese' | 'English'): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("APIキーを設定してください");
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // 利用可能なリストにあったエイリアス "gemini-flash-latest" を使用
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `Translate the following text into ${targetLang}. 
Keep the tone natural. Only return the translated text without any explanations.

Text:
${text}`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error: any) {
        console.error("Translation error:", error);
        throw new Error(error.message || "その他エラーです");
    }
};

export const translateDiff = async (diffLines: string[], targetLang: 'Japanese' | 'English'): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("APIキーを設定してください");
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // 利用可能なリストにあったエイリアス "gemini-flash-latest" を使用
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // 行ごとに翻訳すると API コールが多すぎるため、一括で翻訳しつつ構造を維持させる
        const prompt = `Translate each line of the following text into ${targetLang}. 
The input is an array of lines. 
Translate each line independently and return one translated line per line in the response.
Crucially, keep the exact number of lines. Do not add any extra text or merge lines.

Lines:
${diffLines.join('\n')}`;

        const result = await model.generateContent(prompt);
        const translatedText = result.response.text();
        return translatedText.split('\n').filter(line => line.trim() !== '' || line === '').slice(0, diffLines.length);
    } catch (error: any) {
        console.error("Diff translation error:", error);
        throw new Error(error.message || "その他エラーです");
    }
};
