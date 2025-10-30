import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-6 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">
        テキスト差分チェッカー
      </h1>
      <p className="mt-2 text-lg text-slate-600">
        2つのテキストを比較し、変更点をハイライト表示します。
      </p>
    </header>
  );
};

export default Header;