import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import Loading from '../components/Loading';

const Quartis = () => {
    const [loading, setLoading] = useState(false);
    const [dados, setDados] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Buscar dados de quartis
    const buscarDados = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`${API_ENDPOINTS.quartis}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    setDados(data);
                } else {
                    throw new Error('Resposta do servidor não é JSON');
                }
            } else {
                // Tentar ler como JSON, se falhar, mostrar mensagem genérica
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    alert(`Erro: ${error.message || 'Erro ao buscar dados'}`);
                } else {
                    if (response.status === 404) {
                        alert('Erro: Rota não encontrada. O servidor precisa ser reiniciado para carregar a nova rota.');
                    } else {
                        alert(`Erro: ${response.status} ${response.statusText}`);
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao buscar quartis:', error);
            if (error.message.includes('JSON')) {
                alert('Erro: O servidor retornou uma resposta inválida. Verifique se o servidor está rodando e se a rota está disponível.');
            } else {
                alert('Erro ao buscar dados de quartis: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Buscar dados ao carregar a página
    useEffect(() => {
        buscarDados();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Função para extrair apenas o número do agente
    const extrairNumeroAgente = (agente) => {
        if (!agente) return '';
        // Se for apenas número, retornar direto
        if (/^\d+$/.test(agente.trim())) {
            return agente.trim();
        }
        // Se tiver formato "número - nome", extrair o número
        const match = agente.match(/^(\d+)/);
        if (match) {
            return match[1];
        }
        // Se não encontrar número, retornar o valor original (fallback)
        return agente;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <section>
                {/* Filtros Compactos - Topo */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-4 max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 justify-center">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Data Inicial</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Data Final</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={buscarDados}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                            >
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>

                {loading && <Loading message="Carregando dados de quartis..." />}

                {dados && (() => {
                    return (
                        <>
                            {/* Régua Visual de Quartis - Grid 2x2 - Otimizado para Projetor */}
                            <div className="w-full">
                                {/* Grid 2x2 - Tela Grande */}
                                <div className="grid grid-cols-2 gap-6 h-[calc(100vh-120px)]">
                                    {/* 1º Quartil - Top Left */}
                                    <div className="border-4 border-green-400 rounded-xl bg-green-50 p-6 flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-3xl font-bold text-green-800 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-green-500"></div>
                                                1º Quartil - Melhor
                                            </h4>
                                            <span className="text-xl text-green-700 bg-green-100 px-4 py-2 rounded-lg font-semibold">
                                                {dados.quartil1.length} agentes
                                            </span>
                                        </div>
                                        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                                            {dados.quartil1.map((agente, idx) => {
                                                const quantidadeDDA = parseInt(agente.total_dda || 0);
                                                const maxDDA = Math.max(...dados.quartil1.map(a => parseInt(a.total_dda || 0)));
                                                const percentualDDA = maxDDA > 0 ? (quantidadeDDA / maxDDA) * 100 : 0;
                                                
                                                return (
                                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-white border-2 border-green-300 shadow-md">
                                                        <span className="text-xl font-bold text-green-700 w-12 text-center">#{idx + 1}</span>
                                                        <span className="text-2xl font-bold text-slate-800 w-20">
                                                            {extrairNumeroAgente(agente.agente)}
                                                        </span>
                                                        <div className="flex-1 relative">
                                                            <div className="relative h-12 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-400">
                                                                <div 
                                                                    className="h-full rounded-lg transition-all duration-300 flex items-center justify-end pr-3"
                                                                    style={{ 
                                                                        width: `${percentualDDA}%`,
                                                                        backgroundColor: '#10b981',
                                                                        opacity: 0.9
                                                                    }}
                                                                >
                                                                    {percentualDDA > 25 && (
                                                                        <span className="text-lg font-bold text-white">
                                                                            {quantidadeDDA}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {percentualDDA <= 25 && (
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-700">
                                                                        {quantidadeDDA}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2º Quartil - Top Right */}
                                    <div className="border-4 border-blue-400 rounded-xl bg-blue-50 p-6 flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-3xl font-bold text-blue-800 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                                                2º Quartil
                                            </h4>
                                            <span className="text-xl text-blue-700 bg-blue-100 px-4 py-2 rounded-lg font-semibold">
                                                {dados.quartil2.length} agentes
                                            </span>
                                        </div>
                                        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                                            {dados.quartil2.map((agente, idx) => {
                                                const quantidadeDDA = parseInt(agente.total_dda || 0);
                                                const maxDDA = Math.max(...dados.quartil2.map(a => parseInt(a.total_dda || 0)));
                                                const percentualDDA = maxDDA > 0 ? (quantidadeDDA / maxDDA) * 100 : 0;
                                                
                                                return (
                                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-white border-2 border-blue-300 shadow-md">
                                                        <span className="text-xl font-bold text-blue-700 w-12 text-center">#{idx + 1}</span>
                                                        <span className="text-2xl font-bold text-slate-800 w-20">
                                                            {extrairNumeroAgente(agente.agente)}
                                                        </span>
                                                        <div className="flex-1 relative">
                                                            <div className="relative h-12 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-400">
                                                                <div 
                                                                    className="h-full rounded-lg transition-all duration-300 flex items-center justify-end pr-3"
                                                                    style={{ 
                                                                        width: `${percentualDDA}%`,
                                                                        backgroundColor: '#3b82f6',
                                                                        opacity: 0.9
                                                                    }}
                                                                >
                                                                    {percentualDDA > 25 && (
                                                                        <span className="text-lg font-bold text-white">
                                                                            {quantidadeDDA}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {percentualDDA <= 25 && (
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-700">
                                                                        {quantidadeDDA}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 3º Quartil - Bottom Left */}
                                    <div className="border-4 border-yellow-400 rounded-xl bg-yellow-50 p-6 flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-3xl font-bold text-yellow-800 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-yellow-500"></div>
                                                3º Quartil - Atenção
                                            </h4>
                                            <span className="text-xl text-yellow-700 bg-yellow-100 px-4 py-2 rounded-lg font-semibold">
                                                {dados.quartil3.length} agentes
                                            </span>
                                        </div>
                                        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                                            {dados.quartil3.map((agente, idx) => {
                                                const quantidadeDDA = parseInt(agente.total_dda || 0);
                                                const maxDDA = Math.max(...dados.quartil3.map(a => parseInt(a.total_dda || 0)));
                                                const percentualDDA = maxDDA > 0 ? (quantidadeDDA / maxDDA) * 100 : 0;
                                                
                                                return (
                                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-white border-2 border-yellow-300 shadow-md">
                                                        <span className="text-xl font-bold text-yellow-700 w-12 text-center">#{idx + 1}</span>
                                                        <span className="text-2xl font-bold text-slate-800 w-20">
                                                            {extrairNumeroAgente(agente.agente)}
                                                        </span>
                                                        <div className="flex-1 relative">
                                                            <div className="relative h-12 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-400">
                                                                <div 
                                                                    className="h-full rounded-lg transition-all duration-300 flex items-center justify-end pr-3"
                                                                    style={{ 
                                                                        width: `${percentualDDA}%`,
                                                                        backgroundColor: '#f59e0b',
                                                                        opacity: 0.9
                                                                    }}
                                                                >
                                                                    {percentualDDA > 25 && (
                                                                        <span className="text-lg font-bold text-white">
                                                                            {quantidadeDDA}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {percentualDDA <= 25 && (
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-700">
                                                                        {quantidadeDDA}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 4º Quartil - Bottom Right */}
                                    <div className="border-4 border-red-400 rounded-xl bg-red-50 p-6 flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-3xl font-bold text-red-800 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-red-500"></div>
                                                4º Quartil - Baixa
                                            </h4>
                                            <span className="text-xl text-red-700 bg-red-100 px-4 py-2 rounded-lg font-semibold">
                                                {dados.quartil4.length} agentes
                                            </span>
                                        </div>
                                        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                                            {dados.quartil4.map((agente, idx) => {
                                                const quantidadeDDA = parseInt(agente.total_dda || 0);
                                                const maxDDA = Math.max(...dados.quartil4.map(a => parseInt(a.total_dda || 0)));
                                                const percentualDDA = maxDDA > 0 ? (quantidadeDDA / maxDDA) * 100 : 0;
                                                
                                                return (
                                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-white border-2 border-red-300 shadow-md">
                                                        <span className="text-xl font-bold text-red-700 w-12 text-center">#{idx + 1}</span>
                                                        <span className="text-2xl font-bold text-slate-800 w-20">
                                                            {extrairNumeroAgente(agente.agente)}
                                                        </span>
                                                        <div className="flex-1 relative">
                                                            <div className="relative h-12 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-400">
                                                                <div 
                                                                    className="h-full rounded-lg transition-all duration-300 flex items-center justify-end pr-3"
                                                                    style={{ 
                                                                        width: `${percentualDDA}%`,
                                                                        backgroundColor: '#ef4444',
                                                                        opacity: 0.9
                                                                    }}
                                                                >
                                                                    {percentualDDA > 25 && (
                                                                        <span className="text-lg font-bold text-white">
                                                                            {quantidadeDDA}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {percentualDDA <= 25 && (
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-700">
                                                                        {quantidadeDDA}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    );
                })()}
            </section>
        </div>
    );
};

export default Quartis;

