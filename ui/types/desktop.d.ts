export {};

/** Ponte do app desktop (Electron). No navegador comum, window.centralDesktop não existe. */
export type CentralDesktop = {
  plataforma: string;
  versao: string;
  escolherPasta(opcoes?: { titulo?: string; inicial?: string }): Promise<string | null>;
  criarPasta(pai: string, nome: string): Promise<string>;
  abrirPasta(caminho: string): Promise<string>;
  info(): Promise<{ versao: string; plataforma: string; dados: string; config: string; projetos: string }>;
};

declare global {
  interface Window {
    centralDesktop?: CentralDesktop;
  }
}
