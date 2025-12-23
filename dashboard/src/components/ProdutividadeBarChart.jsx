import React from 'react';

export default function ProdutividadeBarChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-800">Produtividade (barras)</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Em construção
        </span>
      </div>
      <p className="text-sm text-slate-500">
        Stub criado para o front subir. Quando você quiser, implementamos consumindo o endpoint
        <code className="mx-1">/api/dashboard/produtividade</code>.
      </p>
    </div>
  );
}


