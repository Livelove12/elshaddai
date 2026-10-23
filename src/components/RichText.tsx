import { Fragment, type ReactNode } from 'react';

/**
 * Renders the small amount of inline emphasis the question bank allows:
 * `**word**` becomes <strong>. Everything else stays literal text, so no HTML
 * from an imported file is ever injected into the page.
 */
export function RichText({ text }: { text: string }): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        const key = `${index}-${part.slice(0, 8)}`;
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={key}>{part.slice(2, -2)}</strong>;
        }
        return <Fragment key={key}>{part}</Fragment>;
      })}
    </>
  );
}
