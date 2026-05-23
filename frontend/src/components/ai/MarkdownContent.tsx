import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      components={{
        p: ({ node, ...props }) => (
          <p className="mb-3 leading-relaxed" {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul
            className="list-disc list-inside mb-3 space-y-1"
            style={{ color: 'var(--color-text-primary)' }}
            {...props}
          />
        ),
        li: ({ node, ...props }) => (
          <li className="ml-2" {...props} />
        ),
        strong: ({ node, ...props }) => (
          <strong className="font-semibold" {...props} />
        ),
        em: ({ node, ...props }) => (
          <em className="italic" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}