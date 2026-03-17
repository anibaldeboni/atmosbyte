import { Link } from "react-router-dom"

export function NotFoundPage(): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Página não encontrada</h2>
      <p className="mt-2 text-sm text-slate-600">A rota não existe na aplicação Atmosbyte.</p>
      <Link to="/" className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        Voltar para a página inicial
      </Link>
    </div>
  )
}
