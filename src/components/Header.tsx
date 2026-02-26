import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-3 text-center shrink-0">
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
        テキスト差分チェッカー
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        2つのテキストを比較し、変更点を表示します。
      </p>
    </header>
  );
};

export default Header;