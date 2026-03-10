import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

const Card = React.memo(({ title, children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
));

// Total por ação (soma quando há múltiplas linhas por ação, ex. modo diário)
const getTotaisPorAcao = (data) => {
    const map = new Map();
    for (const r of data) {
        const acao = r.acao;
        if (!acao) continue;
        map.set(acao, (map.get(acao) || 0) + (Number(r.total) || 0));
    }
    return map;
};

/**
 * Card "Ações neste bloco" com filtro por tipo de ação.
 * - data: array de { acao, total } ou { data, acao, total } (modo diário)
 * - loading / acoesLoading: mostrar "Carregando ações..."
 * - showTable: quando true e data tem campo "data", mostra tabela por dia em vez do gráfico
 * - formatPtBR: função (yyyyMmDd) => string para formatação de datas na tabela
 */
const AcoesNoBlocoCard = ({
    data = [],
    loading = false,
    acoesLoading = false,
    showTable = false,
    formatPtBR = (d) => d
}) => {
    const [selectedAcoes, setSelectedAcoes] = useState(new Set());
    const [filtroVisivel, setFiltroVisivel] = useState(true);

    const uniqueAcoes = useMemo(() => {
        const acoes = [...new Set(data.map((r) => r.acao).filter(Boolean))].sort();
        return acoes;
    }, [data]);

    const filteredData = useMemo(() => {
        if (!data.length) return [];
        if (selectedAcoes.has('__none__')) return [];
        if (selectedAcoes.size === 0) return data;
        return data.filter((r) => selectedAcoes.has(r.acao));
    }, [data, selectedAcoes]);

    const toggleAcao = (acao) => {
        setSelectedAcoes((prev) => {
            const next = new Set(prev);
            next.delete('__none__');
            // Quando todos estão selecionados (prev vazio), clicar = desselecionar só essa ação (mostrar todas exceto esta)
            if (prev.size === 0) {
                return new Set(uniqueAcoes.filter((a) => a !== acao));
            }
            if (next.has(acao)) next.delete(acao);
            else next.add(acao);
            return next;
        });
    };

    const selectAll = () => setSelectedAcoes(new Set());
    const selectNone = () => setSelectedAcoes(new Set(['__none__']));

    const allSelected = selectedAcoes.size === 0;
    const noneSelected = selectedAcoes.has('__none__');

    const totaisPorAcao = useMemo(() => getTotaisPorAcao(data), [data]);
    const selectedCount = allSelected ? uniqueAcoes.length : (noneSelected ? 0 : selectedAcoes.size);
    const totalCount = uniqueAcoes.length;

    if (loading || acoesLoading) {
        return (
            <Card title="Ações neste bloco" className="lg:col-span-2">
                <p className="text-sm text-slate-500 mb-4">Quantidade por tipo de ação no período selecionado.</p>
                <div className="h-80 flex items-center justify-center text-slate-500">Carregando ações...</div>
            </Card>
        );
    }

    const isPorDia = showTable && data.length > 0 && data[0]?.data != null && data[0]?.data !== '';

    return (
        <Card title="Ações neste bloco" className="lg:col-span-2">
            <p className="text-sm text-slate-500 mb-4">
                {isPorDia ? 'Quantidade por tipo de ação em cada dia.' : 'Quantidade por tipo de ação no período selecionado.'}
            </p>

            {data.length > 0 && (
                <div className="mb-4 border border-slate-200 rounded-lg bg-slate-50/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-semibold text-slate-700">Filtrar Ações:</span>
                            <button
                                type="button"
                                onClick={() => setFiltroVisivel((v) => !v)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                                {filtroVisivel ? (
                                    <>Ocultar Filtro <ChevronUp className="w-4 h-4" /></>
                                ) : (
                                    <>Mostrar Filtro <ChevronDown className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                        {filtroVisivel && (
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    Selecionar Todas
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                    type="button"
                                    onClick={selectNone}
                                    className="text-sm font-medium text-slate-600 hover:text-slate-800 hover:underline"
                                >
                                    Desmarcar Todas
                                </button>
                                <span className="text-sm text-slate-500 ml-1">
                                    {selectedCount} de {totalCount} selecionadas
                                </span>
                            </div>
                        )}
                    </div>
                    {filtroVisivel && (
                        <div className="flex flex-wrap gap-2">
                            {uniqueAcoes.map((acao) => {
                                const total = totaisPorAcao.get(acao) ?? 0;
                                const checked = !noneSelected && (allSelected || selectedAcoes.has(acao));
                                return (
                                    <label
                                        key={acao}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                                            checked
                                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleAcao(acao)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 sr-only"
                                            aria-hidden
                                        />
                                        <span className="font-medium">{acao}</span>
                                        <span className="text-slate-500 tabular-nums">({total.toLocaleString('pt-BR')})</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {filteredData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-slate-500">
                    {data.length === 0 ? 'Nenhuma ação no período.' : 'Nenhuma ação selecionada. Marque ao menos um tipo acima.'}
                </div>
            ) : isPorDia ? (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="text-left py-3 px-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10">Ação</th>
                                {[...new Set(filteredData.map((r) => r.data))].sort().map((d) => (
                                    <th key={d} className="py-3 px-2 font-medium text-slate-600 whitespace-nowrap">
                                        {formatPtBR(d)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...new Set(filteredData.map((r) => r.acao))].sort().map((acao) => (
                                <tr key={acao} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-2 px-3 font-medium text-slate-800 sticky left-0 bg-white hover:bg-slate-50 z-10">
                                        {acao}
                                    </td>
                                    {[...new Set(filteredData.map((r) => r.data))].sort().map((d) => (
                                        <td key={d} className="py-2 px-2 text-right text-slate-700 tabular-nums">
                                            {(filteredData.find((r) => r.data === d && r.acao === acao)?.total ?? 0).toLocaleString('pt-BR')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="w-full" style={{ minHeight: 320 }}>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={filteredData} margin={{ top: 8, right: 16, left: 8, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="acao" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={60} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip formatter={(v) => [Number(v).toLocaleString('pt-BR'), 'Total']} />
                            <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
};

export default AcoesNoBlocoCard;
