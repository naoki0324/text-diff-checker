import React from 'react';

interface TextAreaWithUploadProps {
  id: string;
  title: string;
  onTitleChange: (newTitle: string) => void;
  value: string;
  onValueChange: (value: string) => void;
  onFileSelect: (file: File) => void;
  placeholder: string;
}

const FileUploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L6.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);

const PencilIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
);


const TextAreaWithUpload: React.FC<TextAreaWithUploadProps> = ({
  id,
  title,
  onTitleChange,
  value,
  onValueChange,
  onFileSelect,
  placeholder
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between items-center mb-2">
        <div 
          className="flex items-center group cursor-text"
          onClick={() => titleInputRef.current?.focus()}
        >
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            aria-label="タイトルを編集"
            className="text-lg font-semibold text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-white rounded-md p-1 -m-1"
          />
          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
            <PencilIcon />
          </div>
        </div>
        <input
          type="file"
          accept=".txt, .md, .json, .csv, .js, .ts, .html, .css"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${id}`}
        />
        <button
          onClick={handleButtonClick}
          className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-white"
        >
          <FileUploadIcon />
          ファイルをアップロード
        </button>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-full flex-grow p-4 bg-slate-50 border-2 border-slate-300 border-dashed rounded-lg text-slate-800 font-sans text-base resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
        spellCheck="false"
      />
    </div>
  );
};

export default TextAreaWithUpload;