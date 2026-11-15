import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
          img: ({ alt }) => <span className="muted">[imagem: {alt || "sem descrição"}]</span>
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
