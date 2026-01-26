import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import Loading from '../components/Loading';

const Quartis = () => {
    const [loading, setLoading] = useState(false);
    const [dados, setDados] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [modoProjetor, setModoProjetor] = useState(false);

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
        <div className={`min-h-screen bg-slate-50 ${modoProjetor ? 'p-4' : 'space-y-6 px-4'}`}>
            <section>
                {/* Cabeçalho com Título e Botão de Modo Projetor */}
                {!modoProjetor && (
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Quartis de DDA</h2>
                            <p className="text-slate-500">Análise de produção de DDA por agente dividida em quartis</p>
                        </div>
                        <button
                            onClick={() => setModoProjetor(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                            title="Ativar modo projetor (tela grande)"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Modo Projetor
                        </button>
                    </div>
                )}

                {/* Filtros */}
                <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${modoProjetor ? 'p-3 mb-4 max-w-4xl mx-auto' : 'p-6 mb-6'}`}>
                    <div className={`flex items-center ${modoProjetor ? 'gap-4 justify-center' : 'gap-4'}`}>
                        <div>
                            <label className={`block ${modoProjetor ? 'text-xs' : 'text-sm'} font-medium text-slate-700 mb-2`}>
                                Data Inicial
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`${modoProjetor ? 'px-3 py-2 text-sm' : 'w-full px-3 py-2'} border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            />
                        </div>
                        <div>
                            <label className={`block ${modoProjetor ? 'text-xs' : 'text-sm'} font-medium text-slate-700 mb-2`}>
                                Data Final
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`${modoProjetor ? 'px-3 py-2 text-sm' : 'w-full px-3 py-2'} border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                onClick={buscarDados}
                                className={`${modoProjetor ? 'px-6 py-2 text-sm' : 'w-full px-4 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium`}
                            >
                                Buscar
                            </button>
                            {modoProjetor && (
                                <button
                                    onClick={() => setModoProjetor(false)}
                                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm flex items-center gap-2"
                                    title="Voltar ao modo normal"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Sair
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {loading && <Loading message="Carregando dados de quartis..." />}

                {dados && (() => {
                    // Calcular quantidade total geral de DDA
                    const quantidadeTotalGeral = (
                        (dados.estatisticas.quartil1.total || 0) +
                        (dados.estatisticas.quartil2.total || 0) +
                        (dados.estatisticas.quartil3.total || 0) +
                        (dados.estatisticas.quartil4.total || 0)
                    );
                    
                    // Calcular porcentagem de cada quartil
                    const calcularPercentual = (quantidadeQuartil) => {
                        if (quantidadeTotalGeral === 0) return 0;
                        return (quantidadeQuartil / quantidadeTotalGeral) * 100;
                    };
                    
                    const percentualQuartil1 = calcularPercentual(dados.estatisticas.quartil1.total || 0);
                    const percentualQuartil2 = calcularPercentual(dados.estatisticas.quartil2.total || 0);
                    const percentualQuartil3 = calcularPercentual(dados.estatisticas.quartil3.total || 0);
                    const percentualQuartil4 = calcularPercentual(dados.estatisticas.quartil4.total || 0);

                    // Função para renderizar um quartil (reutilizável)
                    const renderizarQuartil = (quartil, quartilNum, corHex, corBg, corBorda, corTexto, titulo) => {
                        return (
                            <div className={`${modoProjetor ? 'border-4' : 'border-2'} ${corBorda} rounded-xl ${corBg} ${modoProjetor ? 'p-6' : 'p-4'} flex flex-col`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className={`${modoProjetor ? 'text-3xl' : 'text-lg'} font-bold ${corTexto} flex items-center ${modoProjetor ? 'gap-3' : 'gap-2'}`}>
                                        <div className={`${modoProjetor ? 'w-8 h-8' : 'w-4 h-4'} rounded-full`} style={{ backgroundColor: corHex }}></div>
                                        {titulo}
                                    </h4>
                                    <span className={`${modoProjetor ? 'text-xl px-4 py-2' : 'text-xs px-2 py-1'} ${corTexto} ${corBg} rounded-lg font-semibold`}>
                                        {quartil.length} agentes
                                    </span>
                                </div>
                                <div className={`${modoProjetor ? 'space-y-3' : 'space-y-2'} flex-1 overflow-y-auto pr-2`}>
                                    {quartil.map((agente, idx) => {
                                        const quantidadeDDA = parseInt(agente.total_dda || 0);
                                        const maxDDA = Math.max(...quartil.map(a => parseInt(a.total_dda || 0)));
                                        const percentualDDA = maxDDA > 0 ? (quantidadeDDA / maxDDA) * 100 : 0;
                                        
                                        return (
                                            <div key={idx} className={`flex items-center ${modoProjetor ? 'gap-4 p-4' : 'gap-2 p-2'} rounded-lg bg-white ${modoProjetor ? 'border-2' : 'border'} ${corBorda} ${modoProjetor ? 'shadow-md' : 'hover:shadow-sm'} transition-shadow`}>
                                                <span className={`${modoProjetor ? 'text-xl w-12' : 'text-xs w-8'} font-bold ${corTexto} text-center`}>#{idx + 1}</span>
                                                <span className={`${modoProjetor ? 'text-2xl w-20' : 'text-sm w-12'} font-semibold text-slate-800`}>
                                                    {extrairNumeroAgente(agente.agente)}
                                                </span>
                                                <div className="flex-1 relative">
                                                    <div className={`relative ${modoProjetor ? 'h-12' : 'h-6'} bg-slate-200 rounded-lg overflow-hidden ${modoProjetor ? 'border-2 border-slate-400' : 'border border-slate-300'}`}>
                                                        <div 
                                                            className="h-full rounded-lg transition-all duration-300 flex items-center justify-end pr-1"
                                                            style={{ 
                                                                width: `${percentualDDA}%`,
                                                                backgroundColor: corHex,
                                                                opacity: 0.9
                                                            }}
                                                        >
                                                            {percentualDDA > (modoProjetor ? 25 : 20) && (
                                                                <span className={`${modoProjetor ? 'text-lg' : 'text-xs'} font-bold text-white`}>
                                                                    {quantidadeDDA}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {percentualDDA <= (modoProjetor ? 25 : 20) && (
                                                            <span className={`absolute ${modoProjetor ? 'right-3' : 'right-1'} top-1/2 -translate-y-1/2 ${modoProjetor ? 'text-lg' : 'text-xs'} font-bold ${modoProjetor ? 'text-slate-700' : 'text-slate-600'}`}>
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
                        );
                    };

                    return (
                        <>
                            {modoProjetor ? (
                                // Modo Projetor - Tela Grande
                                <div className="w-full">
                                    <div className="grid grid-cols-2 gap-6 h-[calc(100vh-120px)]">
                                        {renderizarQuartil(dados.quartil1, 1, '#10b981', 'bg-green-50', 'border-green-400', 'text-green-800', '1º Quartil - Melhor')}
                                        {renderizarQuartil(dados.quartil2, 2, '#3b82f6', 'bg-blue-50', 'border-blue-400', 'text-blue-800', '2º Quartil')}
                                        {renderizarQuartil(dados.quartil3, 3, '#f59e0b', 'bg-yellow-50', 'border-yellow-400', 'text-yellow-800', '3º Quartil - Atenção')}
                                        {renderizarQuartil(dados.quartil4, 4, '#ef4444', 'bg-red-50', 'border-red-400', 'text-red-800', '4º Quartil - Baixa')}
                                    </div>
                                </div>
                            ) : (
                                // Modo Normal - Visualização Completa
                                <>
                                    {/* Card de Quantidade Total Geral */}
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg border border-blue-500 p-6 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-blue-100 mb-1">Quantidade Total de DDA</h3>
                                                <p className="text-3xl font-bold text-white">
                                                    {quantidadeTotalGeral.toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-blue-100">Total de Agentes</p>
                                                <p className="text-2xl font-bold text-white">{dados.totalAgentes}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cards de Resumo */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-medium text-slate-600">1º Quartil</h3>
                                                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-800">
                                                {dados.estatisticas.quartil1.total.toLocaleString('pt-BR')}
                                            </p>
                                            <p className="text-sm text-slate-500">Quantidade de DDA</p>
                                            <p className="text-lg font-semibold text-green-600 mt-2">
                                                {percentualQuartil1.toFixed(2)}%
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {dados.quartil1.length} agente{dados.quartil1.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-medium text-slate-600">2º Quartil</h3>
                                                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-800">
                                                {dados.estatisticas.quartil2.total.toLocaleString('pt-BR')}
                                            </p>
                                            <p className="text-sm text-slate-500">Quantidade de DDA</p>
                                            <p className="text-lg font-semibold text-blue-600 mt-2">
                                                {percentualQuartil2.toFixed(2)}%
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {dados.quartil2.length} agente{dados.quartil2.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-medium text-slate-600">3º Quartil</h3>
                                                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-800">
                                                {dados.estatisticas.quartil3.total.toLocaleString('pt-BR')}
                                            </p>
                                            <p className="text-sm text-slate-500">Quantidade de DDA</p>
                                            <p className="text-lg font-semibold text-yellow-600 mt-2">
                                                {percentualQuartil3.toFixed(2)}%
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {dados.quartil3.length} agente{dados.quartil3.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-medium text-slate-600">4º Quartil</h3>
                                                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-800">
                                                {dados.estatisticas.quartil4.total.toLocaleString('pt-BR')}
                                            </p>
                                            <p className="text-sm text-slate-500">Quantidade de DDA</p>
                                            <p className="text-lg font-semibold text-red-600 mt-2">
                                                {percentualQuartil4.toFixed(2)}%
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {dados.quartil4.length} agente{dados.quartil4.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Régua Visual de Quartis - Grid 2x2 - Modo Normal */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Régua Visual de Quartis - Ranking de Agentes</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {renderizarQuartil(dados.quartil1, 1, '#10b981', 'bg-green-50', 'border-green-300', 'text-green-800', '1º Quartil - Melhor')}
                                            {renderizarQuartil(dados.quartil2, 2, '#3b82f6', 'bg-blue-50', 'border-blue-300', 'text-blue-800', '2º Quartil')}
                                            {renderizarQuartil(dados.quartil3, 3, '#f59e0b', 'bg-yellow-50', 'border-yellow-300', 'text-yellow-800', '3º Quartil - Atenção')}
                                            {renderizarQuartil(dados.quartil4, 4, '#ef4444', 'bg-red-50', 'border-red-300', 'text-red-800', '4º Quartil - Baixa')}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    );
                })()}
            </section>
        </div>
    );
};

export default Quartis;

