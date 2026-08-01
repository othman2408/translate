import type { CSSProperties } from 'react';
import ReactMarkdown from 'react-markdown';

const ALLOWED_MARKDOWN_ELEMENTS = [
  'p',
  'br',
  'strong',
  'em',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
] as const;

export function MarkdownText({
  className,
  dir,
  lang,
  style,
  text,
}: {
  className?: string;
  dir?: string;
  lang?: string;
  style?: CSSProperties;
  text: string;
}) {
  return (
    <div className={className} dir={dir} lang={lang} style={style}>
      <ReactMarkdown
        allowedElements={[...ALLOWED_MARKDOWN_ELEMENTS]}
        skipHtml
        unwrapDisallowed
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
