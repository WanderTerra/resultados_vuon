import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import Loading from '../components/Loading';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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

    // Preparar dados para o gráfico
    const prepararDadosGrafico = () => {
        if (!dados) return [];
        
        const cores = {
            quartil1: '#10b981', // Verde - melhor desempenho
            quartil2: '#3b82f6', // Azul
            quartil3: '#f59e0b', // Laranja
            quartil4: '#ef4444'  // Vermelho - pior desempenho
        };

        return [
            {
                quartil: '1º Quartil',
                agentes: dados.quartil1.length,
                media: dados.estatisticas.quartil1.media,
                min: dados.estatisticas.quartil1.min,
                max: dados.estatisticas.quartil1.max,
                total: dados.estatisticas.quartil1.total || 0,
                valorTotal: dados.estatisticas.quartil1.total || 0,
                cor: cores.quartil1
            },
            {
                quartil: '2º Quartil',
                agentes: dados.quartil2.length,
                media: dados.estatisticas.quartil2.media,
                min: dados.estatisticas.quartil2.min,
                max: dados.estatisticas.quartil2.max,
                total: dados.estatisticas.quartil2.total || 0,
                valorTotal: dados.estatisticas.quartil2.total || 0,
                cor: cores.quartil2
            },
            {
                quartil: '3º Quartil',
                agentes: dados.quartil3.length,
                media: dados.estatisticas.quartil3.media,
                min: dados.estatisticas.quartil3.min,
                max: dados.estatisticas.quartil3.max,
                total: dados.estatisticas.quartil3.total || 0,
                valorTotal: dados.estatisticas.quartil3.total || 0,
                cor: cores.quartil3
            },
            {
                quartil: '4º Quartil',
                agentes: dados.quartil4.length,
                media: dados.estatisticas.quartil4.media,
                min: dados.estatisticas.quartil4.min,
                max: dados.estatisticas.quartil4.max,
                total: dados.estatisticas.quartil4.total || 0,
                valorTotal: dados.estatisticas.quartil4.total || 0,
                cor: cores.quartil4
            }
        ];
    };

    const dadosGrafico = prepararDadosGrafico();

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
        <div className="space-y-6 px-4">
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Quartis de DDA</h2>
                        <p className="text-slate-500">Análise de produção de DDA por agente dividida em quartis</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Filtros</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Data Inicial
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Data Final
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={buscarDados}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>

                {loading && <Loading message="Carregando dados de quartis..." />}

                {dados && (
                    <>
                        {/* Cards de Resumo */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-slate-600">1º Quartil</h3>
                                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">
                                    R$ {dados.estatisticas.quartil1.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-sm text-slate-500">Valor Total</p>
                                <p className="text-xs text-slate-400 mt-2">
                                    {dados.quartil1.length} agente{dados.quartil1.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-slate-600">2º Quartil</h3>
                                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">
                                    R$ {dados.estatisticas.quartil2.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-sm text-slate-500">Valor Total</p>
                                <p className="text-xs text-slate-400 mt-2">
                                    {dados.quartil2.length} agente{dados.quartil2.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-slate-600">3º Quartil</h3>
                                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">
                                    R$ {dados.estatisticas.quartil3.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-sm text-slate-500">Valor Total</p>
                                <p className="text-xs text-slate-400 mt-2">
                                    {dados.quartil3.length} agente{dados.quartil3.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-slate-600">4º Quartil</h3>
                                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">
                                    R$ {dados.estatisticas.quartil4.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-sm text-slate-500">Valor Total</p>
                                <p className="text-xs text-slate-400 mt-2">
                                    {dados.quartil4.length} agente{dados.quartil4.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {/* Gráfico de Comparação */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Comparação entre Quartis - Valor Total</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="quartil" 
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis 
                                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip 
                                        formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="valorTotal" name="Valor Total (R$)">
                                        {dadosGrafico.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.cor} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Tabelas Detalhadas por Quartil */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* 1º Quartil */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">1º Quartil - Maior Produção</h3>
                                    <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                        {dados.quartil1.length} agentes
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Agente</th>
                                                <th className="text-right py-3 px-4 font-semibold text-slate-700">Valor Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dados.quartil1.map((agente, idx) => (
                                                <tr key={idx} className="border-b border-slate-100">
                                                    <td className="py-2 px-4 text-slate-700">{extrairNumeroAgente(agente.agente)}</td>
                                                    <td className="py-2 px-4 text-right font-medium text-green-600">
                                                        R$ {parseFloat(agente.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 2º Quartil */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">2º Quartil</h3>
                                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                        {dados.quartil2.length} agentes
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Agente</th>
                                                <th className="text-right py-3 px-4 font-semibold text-slate-700">Valor Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dados.quartil2.map((agente, idx) => (
                                                <tr key={idx} className="border-b border-slate-100">
                                                    <td className="py-2 px-4 text-slate-700">{extrairNumeroAgente(agente.agente)}</td>
                                                    <td className="py-2 px-4 text-right font-medium text-blue-600">
                                                        R$ {parseFloat(agente.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3º Quartil */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">3º Quartil - Atenção Necessária</h3>
                                    <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                        {dados.quartil3.length} agentes
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Agente</th>
                                                <th className="text-right py-3 px-4 font-semibold text-slate-700">Valor Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dados.quartil3.map((agente, idx) => (
                                                <tr key={idx} className="border-b border-slate-100">
                                                    <td className="py-2 px-4 text-slate-700">{extrairNumeroAgente(agente.agente)}</td>
                                                    <td className="py-2 px-4 text-right font-medium text-yellow-600">
                                                        R$ {parseFloat(agente.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4º Quartil */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">4º Quartil - Produção Muito Baixa</h3>
                                    <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                        {dados.quartil4.length} agentes
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Agente</th>
                                                <th className="text-right py-3 px-4 font-semibold text-slate-700">Valor Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dados.quartil4.map((agente, idx) => (
                                                <tr key={idx} className="border-b border-slate-100">
                                                    <td className="py-2 px-4 text-slate-700">{extrairNumeroAgente(agente.agente)}</td>
                                                    <td className="py-2 px-4 text-right font-medium text-red-600">
                                                        R$ {parseFloat(agente.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default Quartis;

