import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';
import Loading from '../components/Loading';

const Quartis = () => {
    const [loading, setLoading] = useState(false);
    const [dados, setDados] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [apenasFixos, setApenasFixos] = useState(false); // Por padrão, mostrar todos os agentes

    // Buscar dados de quartis
    const buscarDados = async (apenasFixosParam = null) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            // Usar o parâmetro passado ou o estado atual
            const apenasFixosValue = apenasFixosParam !== null ? apenasFixosParam : apenasFixos;
            if (apenasFixosValue) params.append('apenasFixos', 'true');

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

    // Função para obter o mês atual (primeiro dia até hoje)
    const obterMesAtual = () => {
        const hoje = new Date();
        const formatarData = (data) => {
            const ano = data.getFullYear();
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const dia = String(data.getDate()).padStart(2, '0');
            return `${ano}-${mes}-${dia}`;
        };
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        return {
            startDate: formatarData(primeiroDiaMes),
            endDate: formatarData(hoje)
        };
    };

    // Inicializar com o mês atual
    useEffect(() => {
        const { startDate: inicioMes, endDate: fimMes } = obterMesAtual();
        setStartDate(inicioMes);
        setEndDate(fimMes);
        
        // Buscar dados com o mês atual
        const buscarDadosMesAtual = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const params = new URLSearchParams();
                params.append('startDate', inicioMes);
                params.append('endDate', fimMes);
                if (apenasFixos) params.append('apenasFixos', 'true');

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

        buscarDadosMesAtual();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Funções para definir períodos rápidos
    const aplicarFiltroRapido = async (periodo) => {
        const hoje = new Date();
        const formatarData = (data) => {
            const ano = data.getFullYear();
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const dia = String(data.getDate()).padStart(2, '0');
            return `${ano}-${mes}-${dia}`;
        };

        let novaStartDate = '';
        let novaEndDate = '';

        switch (periodo) {
            case 'todos':
                novaStartDate = '';
                novaEndDate = '';
                break;
            case 'esta-semana':
                const inicioSemana = new Date(hoje);
                inicioSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo
                novaStartDate = formatarData(inicioSemana);
                novaEndDate = formatarData(hoje);
                break;
            case 'mes-passado':
                const primeiroDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
                const ultimoDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
                novaStartDate = formatarData(primeiroDiaMesPassado);
                novaEndDate = formatarData(ultimoDiaMesPassado);
                break;
            case 'este-mes':
                const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                novaStartDate = formatarData(primeiroDiaMes);
                novaEndDate = formatarData(hoje);
                break;
            default:
                break;
        }

        // Atualizar estados
        setStartDate(novaStartDate);
        setEndDate(novaEndDate);

        // Buscar dados com os novos períodos
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (novaStartDate) params.append('startDate', novaStartDate);
            if (novaEndDate) params.append('endDate', novaEndDate);
            if (apenasFixos) params.append('apenasFixos', 'true');

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
                {/* Filtros */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    {/* Botões de Filtro Rápido */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Filtrar Período:
                            </span>
                            <button
                                onClick={() => aplicarFiltroRapido('todos')}
                                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => aplicarFiltroRapido('esta-semana')}
                                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                            >
                                Esta Semana
                            </button>
                            <button
                                onClick={() => aplicarFiltroRapido('este-mes')}
                                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                            >
                                Este Mês
                            </button>
                            <button
                                onClick={() => aplicarFiltroRapido('mes-passado')}
                                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                            >
                                Mês Passado
                            </button>
                        </div>
                    </div>

                    {/* Opção de filtrar apenas agentes fixos */}
                    <div className="mb-4 pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="apenasFixos"
                                checked={apenasFixos}
                                onChange={(e) => {
                                    const novoValor = e.target.checked;
                                    setApenasFixos(novoValor);
                                    // Buscar dados automaticamente ao alterar, passando o novo valor
                                    buscarDados(novoValor);
                                }}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="apenasFixos" className="text-sm font-medium text-slate-700 cursor-pointer">
                                Mostrar agentes fixos da carteira Vuon
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-6">
                            Exibe apenas os agentes fixos da Carteira Vuon
                        </p>
                    </div>

                    {/* Campos de Data Manual */}
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

                {dados && (() => {
                    // Calcular quantidade total geral de DDA
                    const quantidadeTotalGeral = (
                        (dados.estatisticas.quartil1.total || 0) +
                        (dados.estatisticas.quartil2.total || 0) +
                        (dados.estatisticas.quartil3.total || 0) +
                        (dados.estatisticas.quartil4.total || 0)
                    );

                    // Verificar se há aviso do backend
                    const temAviso = dados.aviso && dados.totalAgentes === 0;
                    
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
                            <div className={`border-2 ${corBorda} rounded-xl ${corBg} p-4 flex flex-col`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className={`text-lg font-bold ${corTexto} flex items-center gap-2`}>
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: corHex }}></div>
                                        {titulo}
                                    </h4>
                                    <span className={`text-xs px-2 py-1 ${corTexto} ${corBg} rounded-lg font-semibold`}>
                                        {quartil.length} agentes
                                    </span>
                                </div>
                                <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                                    {quartil.map((agente, idx) => {
                                        const quantidadeDDA = parseInt(agente.total_dda || 0);
                                        const maxDDA = Math.max(...quartil.map(a => parseInt(a.total_dda || 0)));
                                        const percentualDDA = maxDDA > 0 ? (quantidadeDDA / maxDDA) * 100 : 0;
                                        
                                        return (
                                            <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg bg-white border ${corBorda} hover:shadow-sm transition-shadow`}>
                                                <span className={`text-xs w-8 font-bold ${corTexto} text-center`}>#{idx + 1}</span>
                                                <span className="text-sm w-12 font-semibold text-slate-800">
                                                    {extrairNumeroAgente(agente.agente)}
                                                </span>
                                                <div className="flex-1 relative">
                                                    <div className="relative h-6 bg-slate-200 rounded-lg overflow-hidden border border-slate-300">
                                                        <div 
                                                            className="h-full rounded-lg transition-all duration-300 flex items-center justify-end pr-1"
                                                            style={{ 
                                                                width: `${percentualDDA}%`,
                                                                backgroundColor: corHex,
                                                                opacity: 0.9
                                                            }}
                                                        >
                                                            {percentualDDA > 20 && (
                                                                <span className="text-xs font-bold text-white">
                                                                    {quantidadeDDA}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {percentualDDA <= 20 && (
                                                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
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
                            {/* Aviso se não houver dados */}
                            {temAviso && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="text-sm font-medium text-yellow-800">Aviso</p>
                                            <p className="text-sm text-yellow-700 mt-1">{dados.aviso}</p>
                                            {dados.aviso && dados.aviso.includes('Nenhum agente fixo') && (
                                                <p className="text-sm text-yellow-700 mt-2">
                                                    <strong>Dica:</strong> Acesse a página <strong>"Cadastrar Agentes"</strong> no menu lateral 
                                                    para cadastrar os agentes fixos da carteira Vuon.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

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

                            {/* Régua Visual de Quartis - Grid 2x2 */}
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
                    );
                })()}
            </section>
        </div>
    );
};

export default Quartis;

