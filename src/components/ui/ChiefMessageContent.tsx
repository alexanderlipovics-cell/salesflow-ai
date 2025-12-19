import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

interface ChiefMessageContentProps {
  content: string;
}

export default function ChiefMessageContent({ content }: ChiefMessageContentProps) {
  
  const CopyButton = ({ text }: { text: string }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    };

    return (
      <button 
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-600 text-gray-400 hover:text-white transition-all"
        title="Code kopieren"
      >
        {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
    );
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Code-Blöcke mit Syntax Highlighting
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const codeText = String(children).replace(/\n$/, '');

          return !inline && match ? (
            <div className="relative group my-4 rounded-xl overflow-hidden border border-gray-700/50 shadow-lg">
              {/* Header mit Sprache */}
              <div className="bg-[#1e1e1e] px-4 py-1.5 flex justify-between items-center border-b border-gray-700/50">
                <span className="text-xs text-gray-500 font-mono uppercase">{match[1]}</span>
                <CopyButton text={codeText} />
              </div>
              
              <SyntaxHighlighter
                {...props}
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  backgroundColor: '#0d1117',
                  fontSize: '0.9rem',
                }}
              >
                {codeText}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code {...props} className="bg-gray-800/50 text-cyan-300 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-700/30">
              {children}
            </code>
          );
        },
        
        // Tabellen
        table({ children }) {
          return <div className="overflow-x-auto my-4 rounded-lg border border-gray-700"><table className="min-w-full divide-y divide-gray-700 text-sm text-gray-300">{children}</table></div>;
        },
        thead({ children }) {
          return <thead className="bg-gray-800/50 text-xs uppercase font-medium text-gray-400">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-gray-700/50 bg-gray-900/20">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="hover:bg-gray-800/30 transition-colors">{children}</tr>;
        },
        th({ children }) {
          return <th className="px-4 py-3 text-left tracking-wider">{children}</th>;
        },
        td({ children }) {
          return <td className="px-4 py-3 whitespace-nowrap">{children}</td>;
        },
        
        // Listen
        ul({ children }) {
          return <ul className="list-disc pl-5 space-y-1 my-2 text-gray-300">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-5 space-y-1 my-2 text-gray-300">{children}</ol>;
        },
        
        // Links
        a({ children, href }) {
          return <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">{children}</a>;
        },
        
        // Überschriften
        h1({ children }) { return <h1 className="text-2xl font-bold mt-6 mb-4 text-white border-b border-gray-700 pb-2">{children}</h1> },
        h2({ children }) { return <h2 className="text-xl font-bold mt-5 mb-3 text-white">{children}</h2> },
        h3({ children }) { return <h3 className="text-lg font-bold mt-4 mb-2 text-gray-200">{children}</h3> },
        
        // Paragraphen
        p({ children }) {
          return <p className="my-2 leading-relaxed text-gray-200">{children}</p>;
        },
        
        // Bold & Italic
        strong({ children }) {
          return <strong className="font-bold text-white">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-gray-300">{children}</em>;
        },
        
        // Blockquotes
        blockquote({ children }) {
          return <blockquote className="border-l-4 border-cyan-500 pl-4 my-4 text-gray-400 italic">{children}</blockquote>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

