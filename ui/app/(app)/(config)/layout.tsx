import { ConfigNav } from "@/components/ConfigNav";

/** Configurações: barra da seção + conteúdo (padrão da Loja do OpenBot). */
export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cfg">
      <ConfigNav />
      <div className="cfg__body">{children}</div>
    </div>
  );
}
