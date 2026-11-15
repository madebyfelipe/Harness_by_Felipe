import { isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

/** Markdown sem HTML cru (o padrão do react-markdown): texto de agente não injeta marcação. */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          ),
          pre: ({ children }) => {
            const cls = isValidElement<{ className?: string }>(children) ? children.props.className ?? "" : "";
            return <CodeBlock lang={/language-([\w-]+)/.exec(cls)?.[1] ?? ""}>{children}</CodeBlock>;
          },
          img: ({ alt }) => <span className="muted">[imagem: {alt || "sem descrição"}]</span>
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
