import React, { useEffect, useState } from 'react';
import { aloService } from '../services/aloService';
import Loading from './Loading';

const Metrics = () => {
    const [summary, setSummary] = useState(null);
    const [cpcSummary, setCpcSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [summaryRes, cpcRes] = await Promise.all([
                    aloService.getSummary(),
                    aloService.getCpcCpcaSummary()
                ]);
                setSummary(summaryRes.data);
                setCpcSummary(cpcRes.data);
            } catch (err) {
                console.error('Error fetching metrics:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <p className="text-slate-500 text-sm font-medium mb-1">Total ALO</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {summary?.total_alo?.toLocaleString('pt-BR') || 0}
                </h3>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <p className="text-slate-500 text-sm font-medium mb-1">Tipos de Ação</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {summary?.total_acoes || 0}
                </h3>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <p className="text-slate-500 text-sm font-medium mb-1">Clientes Únicos</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {summary?.total_clientes?.toLocaleString('pt-BR') || 0}
                </h3>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <p className="text-slate-500 text-sm font-medium mb-1">Total CPC</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {cpcSummary?.total_cpc?.toLocaleString('pt-BR') || 0}
                </h3>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <p className="text-slate-500 text-sm font-medium mb-1">Total CPCA</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {cpcSummary?.total_cpca?.toLocaleString('pt-BR') || 0}
                </h3>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <p className="text-slate-500 text-sm font-medium mb-1">% CPC sobre ALO</p>
                <h3 className="text-2xl font-bold text-slate-800">
                    {percentualCpc}%
                </h3>
            </div>
        </div>
    );
};

export default Metrics;

