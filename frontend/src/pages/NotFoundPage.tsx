import { Link } from "react-router-dom"

export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="not-found-card rounded-xl border p-8 text-center shadow-sm">
      <h2 className="not-found-title text-2xl font-bold">Página não encontrada</h2>
      <p className="not-found-description mt-2 text-sm">A rota não existe na aplicação Atmosbyte.</p>
      <Link to="/" className="not-found-link mt-4 inline-block rounded-md px-4 py-2 text-sm font-semibold">
        Voltar para a página inicial
      </Link>
    </div>
  )
}
