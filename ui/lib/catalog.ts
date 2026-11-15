/*
 * Catálogo da tela Apps (estilo Loja do OpenBot). Cada item aponta para um conector
 * (connectors/<nome>.yaml) quando ele existe. Só tem "modelo pronto" o que foi conferido;
 * o resto abre o formulário personalizado (você informa a URL) ou fica "em breve".
 */

export type CatalogItem = {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  cor: string;
  letra: string;
  /** conector = arquivo em connectors/; whatsapp = tela própria; mcp = formulário MCP; breve = ainda não */
  acao: "conector" | "whatsapp" | "mcp" | "rest" | "breve";
  /** Conector existente que este item representa. */
  conector?: string;
  /** Sugestões para o formulário (nunca segredo). */
  modelo?: { segredo?: string; url?: string; saude?: string; uso?: string };
};

export const CATEGORIES = ["Comunicação", "Vendas e CRM", "Desenvolvimento", "Projetos e documentos", "Conteúdo e SEO"];

export const CATALOG: CatalogItem[] = [
  { id: "whatsapp", nome: "WhatsApp", descricao: "Avisos das rotinas no seu WhatsApp (Evolution API)", categoria: "Comunicação", cor: "#25D366", letra: "W", acao: "whatsapp" },
  { id: "discord", nome: "Discord", descricao: "Canal secundário com os agentes", categoria: "Comunicação", cor: "#5865F2", letra: "D", acao: "breve" },
  { id: "email", nome: "E-mail Hostinger", descricao: "Caixas de envio em blocos e leitura de respostas", categoria: "Comunicação", cor: "#673DE6", letra: "H", acao: "breve" },

  { id: "twenty", nome: "Twenty CRM", descricao: "Leads, campanhas e notas", categoria: "Vendas e CRM", cor: "#141414", letra: "T", acao: "conector", conector: "twenty" },
  {
    id: "apify",
    nome: "Apify",
    descricao: "Google Maps e raspagem (com teto de gasto)",
    categoria: "Vendas e CRM",
    cor: "#97D700",
    letra: "A",
    acao: "rest",
    modelo: { segredo: "APIFY_TOKEN", saude: "https://api.apify.com/v2/users/me", uso: "Captura de leads do Google Maps (teto de gasto por ciclo obrigatório)." }
  },
  { id: "calcom", nome: "cal.com", descricao: "Conversas de 15 minutos", categoria: "Vendas e CRM", cor: "#111111", letra: "C", acao: "breve" },
  { id: "snov", nome: "Snov.io", descricao: "Aquecimento de e-mail", categoria: "Vendas e CRM", cor: "#2C3E50", letra: "S", acao: "breve" },

  { id: "github", nome: "GitHub", descricao: "Repositórios lpfds e Harness", categoria: "Desenvolvimento", cor: "#24292F", letra: "G", acao: "conector", conector: "github" },
  { id: "vercel", nome: "Vercel", descricao: "Deploy e conferência de Produção", categoria: "Desenvolvimento", cor: "#000000", letra: "▲", acao: "mcp", modelo: { uso: "Deploy e conferência de Produção do site." } },
  { id: "figma", nome: "Figma", descricao: "Design", categoria: "Desenvolvimento", cor: "#F24E1E", letra: "F", acao: "mcp" },

  { id: "trello", nome: "Trello", descricao: "Projetos por milestone", categoria: "Projetos e documentos", cor: "#0079BF", letra: "T", acao: "mcp", modelo: { uso: "Quadros de projeto por milestone (milestones.md)." } },
  { id: "notion", nome: "Notion", descricao: "Páginas e bancos de dados", categoria: "Projetos e documentos", cor: "#191919", letra: "N", acao: "mcp" },
  { id: "google", nome: "Google Drive e Agenda", descricao: "Arquivos de cliente e agenda", categoria: "Projetos e documentos", cor: "#4285F4", letra: "G", acao: "breve" },

  { id: "magnific", nome: "Magnific", descricao: "Fotos de banco para capas e site", categoria: "Conteúdo e SEO", cor: "#FF5A1F", letra: "M", acao: "mcp" },
  { id: "onepagelove", nome: "One Page Love", descricao: "Referências de design", categoria: "Conteúdo e SEO", cor: "#E2445C", letra: "O", acao: "mcp" },
  { id: "postiz", nome: "Postiz", descricao: "Agendar posts", categoria: "Conteúdo e SEO", cor: "#612BD3", letra: "P", acao: "breve" },
  { id: "searchconsole", nome: "Search Console", descricao: "Posições do blog", categoria: "Conteúdo e SEO", cor: "#34A853", letra: "S", acao: "breve" }
];
