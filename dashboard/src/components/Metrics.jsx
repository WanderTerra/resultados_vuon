import React, { useEffect, useState } from 'react';
import { aloService } from '../services/aloService';
import Loading from './Loading';

const Metrics = ({ startDate = null, endDate = null }) => {
    const [summary, setSummary] = useState(null);
    const [cpcSummary, setCpcSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [summaryRes, cpcRes] = await Promise.all([
                    aloService.getSummary(startDate, endDate),
                    aloService.getCpcCpcaSummary(startDate, endDate)
                ]);

                // Só atualizar se a requisição não foi cancelada
                if (!cancelled) {
                    setSummary(summaryRes.data);
                    setCpcSummary(cpcRes.data);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Error fetching metrics:', err);
                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        // Cleanup: cancelar requisição se o componente for desmontado ou filtro mudar
        return () => {
            cancelled = true;
        };
    }, [startDate, endDate]);

    if (loading) {
        return <Loading message="Carregando métricas..." />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="text-red-500">Erro: {error}</div>
            </div>
        );
    }

    const percentualCpc = cpcSummary?.total_alo
        ? ((cpcSummary.total_cpc / cpcSummary.total_alo) * 100).toFixed(2)
        : 0;

    // Função auxiliar para formatar números
    const formatNumber = (value) => {
        if (value === null || value === undefined) return '0';
        const num = Number(value);
        if (isNaN(num)) return '0';
        return num.toLocaleString('pt-BR');
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 min-h-32">
                <p className="text-slate-500 text-sm font-medium mb-2">Total ALO</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {formatNumber(summary?.total_alo)}
                </h3>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 min-h-32">
                <p className="text-slate-500 text-sm font-medium mb-2">Tipos de Ação</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {formatNumber(summary?.total_acoes)}
                </h3>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 min-h-32">
                <p className="text-slate-500 text-sm font-medium mb-2">Clientes Únicos</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {formatNumber(summary?.total_clientes)}
                </h3>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 min-h-32">
                <p className="text-slate-500 text-sm font-medium mb-2">Total CPC</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {formatNumber(cpcSummary?.total_cpc)}
                </h3>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 min-h-32">
                <p className="text-slate-500 text-sm font-medium mb-2">Total CPCA</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {formatNumber(cpcSummary?.total_cpca)}
                </h3>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 min-h-32">
                <p className="text-slate-500 text-sm font-medium mb-2">% CPC sobre ALO</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {percentualCpc}%
                </h3>
            </div>
        </div>
    );
};

export default Metrics;

