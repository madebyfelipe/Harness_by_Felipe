import { RecordsView } from "@/components/RecordsView";

export const metadata = { title: "Registros" };

export default function RegistrosPage() {
  return (
    <main className="main">
      <div className="page">
        <header className="page__head">
          <h1 className="title">Registros</h1>
          <p className="lead">O que rodou, com qual modelo, quanto custou e quem aprovou. Só leitura; nada aqui executa.</p>
        </header>
        <RecordsView />
      </div>
    </main>
  );
}
