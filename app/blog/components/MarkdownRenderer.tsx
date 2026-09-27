"use client";

import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

import { extractExcerpt } from '@/lib/slug';
export { extractExcerpt };

/**
 * Formats inline Markdown (bold, italic, links, code)
 */
function renderInline(text: string): React.ReactNode {
  // Regex to match inline tokens:
  // 1: `code`
  // 2: **bold** or __bold__
  // 3: *italic* or _italic_
  // 4: [link](url)
  // 5: ~~strikethrough~~
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-white/10 text-[#ccff00] font-mono text-[0.9em] border border-white/5"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length > 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length > 4)
    ) {
      return (
        <strong key={index} className="font-black text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return (
        <del key={index} className="line-through text-gray-500">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length > 2)
    ) {
      return (
        <em key={index} className="italic text-gray-300">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, linkText, linkUrl] = linkMatch;
      const isExternal = linkUrl.startsWith('http');
      return (
        <a
          key={index}
          href={linkUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-[#ccff00] hover:underline underline-offset-4 font-semibold inline-flex items-center gap-0.5 transition"
        >
          <span>{linkText}</span>
          {isExternal && <ExternalLink className="w-3 h-3 inline-block opacity-70" />}
        </a>
      );
    }

    return part;
  });
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-2xl bg-[#0c0c0c] border border-white/10 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02] text-xs text-gray-400 font-mono">
        <span className="uppercase text-[11px] font-bold text-[#ccff00]">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400">کپی شد</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">کپی</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-xs text-gray-300 leading-relaxed" dir="ltr">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split into lines to parse block elements
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';

  let listBuffer: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listBuffer.length > 0 && listType) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-4 space-y-2 pr-4 list-disc list-inside text-gray-300 leading-relaxed text-sm">
            {listBuffer}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-4 space-y-2 pr-4 list-decimal list-inside text-gray-300 leading-relaxed text-sm">
            {listBuffer}
          </ol>
        );
      }
      listBuffer = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // Code block toggle: ```lang
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <CodeBlock
            key={`code-${elements.length}`}
            code={codeBuffer.join('\n')}
            language={codeLanguage}
          />
        );
        codeBuffer = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        // Start code block
        flushList();
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Empty line resets lists
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${elements.length}`} className="text-2xl sm:text-3xl font-black text-white mt-8 mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-[#ccff00] rounded-full inline-block" />
          <span>{renderInline(line.slice(2).trim())}</span>
        </h1>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-xl sm:text-2xl font-black text-white mt-7 mb-3.5 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-[#ccff00]/70 rounded-full inline-block" />
          <span>{renderInline(line.slice(3).trim())}</span>
        </h2>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-lg sm:text-xl font-bold text-gray-100 mt-6 mb-3">
          {renderInline(line.slice(4).trim())}
        </h3>
      );
      continue;
    }

    if (line.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${elements.length}`} className="text-base sm:text-lg font-bold text-gray-200 mt-5 mb-2">
          {renderInline(line.slice(5).trim())}
        </h4>
      );
      continue;
    }

    // Blockquote: > text
    if (line.startsWith('> ') || line === '>') {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="my-5 pr-4 pl-3 py-3 border-r-4 border-[#ccff00] bg-white/[0.02] rounded-l-2xl text-sm italic text-gray-300 leading-relaxed font-sans"
        >
          {renderInline(line.replace(/^>\s?/, ''))}
        </blockquote>
      );
      continue;
    }

    // Horizontal Rule: --- or ***
    if (line.trim() === '---' || line.trim() === '***') {
      flushList();
      elements.push(
        <hr key={`hr-${elements.length}`} className="my-8 border-t border-white/10" />
      );
      continue;
    }

    // Image: ![alt](url)
    const imgMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      flushList();
      const [, altText, imgUrl] = imgMatch;
      elements.push(
        <figure key={`img-${elements.length}`} className="my-6 text-center space-y-2">
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <img src={imgUrl} alt={altText || 'تصویر مقاله'} className="w-full max-h-[500px] object-cover mx-auto" />
          </div>
          {altText && (
            <figcaption className="text-xs text-gray-400 font-medium">
              {altText}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    // Unordered List: - item or * item
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      const itemText = line.trim().slice(2);
      listBuffer.push(
        <li key={`li-${listBuffer.length}`} className="text-gray-300">
          {renderInline(itemText)}
        </li>
      );
      continue;
    }

    // Ordered List: 1. item
    const olMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      const itemText = olMatch[2];
      listBuffer.push(
        <li key={`li-${listBuffer.length}`} className="text-gray-300">
          {renderInline(itemText)}
        </li>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="my-4 text-sm sm:text-base text-gray-300 leading-relaxed sm:leading-loose">
        {renderInline(line)}
      </p>
    );
  }

  // Flush any remaining list
  flushList();

  return <div className="markdown-body space-y-1">{elements}</div>;
}
