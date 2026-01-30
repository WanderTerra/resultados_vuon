import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Trophy, Star, AlertTriangle, Info, X, TrendingUp, Compass } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ReferenceArea } from 'recharts';
import { API_ENDPOINTS } from '../config/api';
import Loading from '../components/Loading';

const Quartis = () => {
    const [loading, setLoading] = useState(false);
    const [dados, setDados] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [apenasFixos, setApenasFixos] = useState(true); // Por padrão, mostrar apenas agentes fixos
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
    const [modalAtualizacaoAberto, setModalAtualizacaoAberto] = useState(false);
    const [agentesMovidos, setAgentesMovidos] = useState({}); // { agentId: { fezMaisAcordos, ddaAnterior, ddaAtual } }
    const [animacaoKey, setAnimacaoKey] = useState(0); // Força remount para animação rodar
    const [ddaPorDia, setDdaPorDia] = useState([]); // Série temporal para gráfico de linha
    const [agentesEvolucao, setAgentesEvolucao] = useState([]); // Números dos agentes selecionados para evolução (ex: ['509','602'])
    const [posicaoQuartilPorDia, setPosicaoQuartilPorDia] = useState([]); // Navegação: quartil (1-4) por dia por agente
    const [estatisticasQuartis, setEstatisticasQuartis] = useState({}); // { agente: { q1: %, q2: %, q3: %, q4: % } }
    const dadosRef = useRef(null);

    // Cores distintas para cada linha do gráfico de evolução
    const CORES_EVOLUCAO = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    // Manter ref atualizada para comparação em próximas cargas
    useEffect(() => {
        dadosRef.current = dados;
    }, [dados]);

    // Normalizar chave do agente para comparação (backend pode retornar "682" ou "682 - Nome")
    const normalizarAgente = (ag) => {
        if (!ag) return '';
        const str = String(ag).trim();
        const match = str.match(/^(\d+)/);
        return match ? match[1] : str;
    };

    // Calcular quais agentes mudaram de quartil e/ou fizeram mais acordos entre cargas
    const calcularMovimentos = (prevDados, newDados) => {
        if (!newDados) return {};
        const movimentos = {};
        const quartisDepois = [
            (newDados.quartil1 || []),
            (newDados.quartil2 || []),
            (newDados.quartil3 || []),
            (newDados.quartil4 || []),
        ];
        const mapaAntes = {}; // agent normalizado -> quartil
        const ddaAntes = {};  // agent normalizado -> total_dda
        if (prevDados) {
            [
                (prevDados.quartil1 || []),
                (prevDados.quartil2 || []),
                (prevDados.quartil3 || []),
                (prevDados.quartil4 || []),
            ].forEach((lista, idx) => {
                lista.forEach(a => {
                    const key = normalizarAgente(a.agente);
                    mapaAntes[key] = idx + 1;
                    ddaAntes[key] = parseInt(a.total_dda || 0);
                });
            });
        }
        quartisDepois.forEach((lista, idx) => {
            const quartilAtual = idx + 1;
            lista.forEach(ag => {
                const key = normalizarAgente(ag.agente);
                const quartilAnterior = mapaAntes[key];
                const ddaAtual = parseInt(ag.total_dda || 0);
                const ddaAnterior = ddaAntes[key] ?? 0;
                const fezMaisAcordos = ddaAtual > ddaAnterior;
                const mudouQuartil = quartilAnterior !== undefined && quartilAnterior !== quartilAtual;
                const subiu = mudouQuartil && quartilAtual < quartilAnterior;
                const desceu = mudouQuartil && quartilAtual > quartilAnterior;
                if (mudouQuartil || fezMaisAcordos) {
                    movimentos[key] = {
                        agenteDisplay: ag.agente,
                        deQuartil: quartilAnterior,
                        paraQuartil: quartilAtual,
                        subiu,
                        desceu,
                        fezMaisAcordos,
                        ddaAnterior,
                        ddaAtual,
                    };
                }
            });
        });
        return movimentos;
    };

    // Gera "fingerprint" dos dados para detectar alterações reais
    const fingerprintDados = (d) => {
        if (!d) return '';
        const q = (arr) => (arr || []).map(a => `${a.agente}:${a.total_dda}`).join('|');
        return [q(d.quartil1), q(d.quartil2), q(d.quartil3), q(d.quartil4)].join('||');
    };

    const processarNovosDados = (newData) => {
        const prevDados = dadosRef.current;
        const movimentos = calcularMovimentos(prevDados, newData);
        const temMelhorias = Object.values(movimentos).some(m => m.fezMaisAcordos);
        const houveAlteracao = fingerprintDados(newData) !== fingerprintDados(prevDados);
        if (temMelhorias) setAnimacaoKey(k => k + 1);
        setAgentesMovidos(movimentos);
        setDados(newData);
        if (houveAlteracao) setUltimaAtualizacao(new Date());
    };

    // Busca DDA por dia (total ou por agente) para o gráfico de linha
    const fetchDdaPorDia = async (dataInicio, dataFim, apenasFixosVal, agentesList) => {
        const token = localStorage.getItem('token');
        const paramsLinha = new URLSearchParams();
        if (dataInicio) paramsLinha.append('startDate', dataInicio);
        if (dataFim) paramsLinha.append('endDate', dataFim);
        if (apenasFixosVal) paramsLinha.append('apenasFixos', 'true');
        if (Array.isArray(agentesList) && agentesList.length > 0) {
            paramsLinha.append('agentes', agentesList.join(','));
        }
        try {
            const resLinha = await fetch(`${API_ENDPOINTS.quartisDdaPorDia}?${paramsLinha}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!resLinha.ok) {
                setDdaPorDia([]);
                return;
            }
            const arr = await resLinha.json();
            if (!Array.isArray(arr) || arr.length === 0) {
                setDdaPorDia([]);
                return;
            }
            const primeiro = arr[0];
            if (primeiro && 'agente' in primeiro) {
                const datas = [...new Set(arr.map(r => r.data))].sort();
                const agentesUnicos = [...new Set(arr.map(r => String(r.agente)))].sort();
                const pivoted = datas.map(data => {
                    const row = { data };
                    agentesUnicos.forEach(ag => {
                        const o = arr.find(r => r.data === data && String(r.agente) === ag);
                        row[ag] = o ? (o.total || 0) : 0;
                    });
                    return row;
                });
                setDdaPorDia(pivoted);
            } else {
                setDdaPorDia(arr);
            }
        } catch {
            setDdaPorDia([]);
        }
    };

    // Busca posição (quartil 1-4) por dia para gráfico de navegação do agente
    // Também busca DDA por dia por agente para mostrar no ponto
    const fetchPosicaoQuartilPorDia = async (dataInicio, dataFim, apenasFixosVal, agentesList) => {
        if (!dataInicio || !dataFim || !Array.isArray(agentesList) || agentesList.length === 0) {
            setPosicaoQuartilPorDia([]);
            return;
        }
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        params.append('startDate', dataInicio);
        params.append('endDate', dataFim);
        if (apenasFixosVal) params.append('apenasFixos', 'true');
        params.append('agentes', agentesList.join(','));
        try {
            // Buscar posição quartil
            const res = await fetch(`${API_ENDPOINTS.quartisPosicaoQuartilPorDia}?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) {
                setPosicaoQuartilPorDia([]);
                return;
            }
            const arr = await res.json();
            if (!Array.isArray(arr) || arr.length === 0) {
                setPosicaoQuartilPorDia([]);
                return;
            }
            
            // Buscar DDA por dia por agente (resposta não pivotada: [{ data, agente, total }])
            const paramsDda = new URLSearchParams();
            paramsDda.append('startDate', dataInicio);
            paramsDda.append('endDate', dataFim);
            if (apenasFixosVal) paramsDda.append('apenasFixos', 'true');
            paramsDda.append('agentes', agentesList.join(','));
            const resDda = await fetch(`${API_ENDPOINTS.quartisDdaPorDia}?${paramsDda}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const ddaArr = resDda.ok ? await resDda.json() : [];
            
            // Criar mapa de DDA: { 'data_agente': total }
            const ddaMap = {};
            if (Array.isArray(ddaArr)) {
                ddaArr.forEach(item => {
                    if (item.data && item.agente != null && item.total != null) {
                        const key = `${item.data}_${String(item.agente).trim()}`;
                        ddaMap[key] = item.total;
                    }
                });
            }
            
            const datas = [...new Set(arr.map(r => r.data))].sort();
            const pivoted = datas.map(data => {
                const row = { data };
                agentesList.forEach(ag => {
                    const o = arr.find(r => r.data === data && String(r.agente) === ag);
                    const key = `${data}_${ag}`;
                    const dda = ddaMap[key] || 0;
                    row[ag] = o ? o.quartil : 4; // sem dado = 4º quartil
                    row[`${ag}_dda`] = dda; // armazenar DDA para tooltip/label
                });
                return row;
            });
            setPosicaoQuartilPorDia(pivoted);
            
            // Calcular estatísticas de porcentagem de dias em cada quartil
            calcularEstatisticasQuartis(pivoted, agentesList);
        } catch (err) {
            console.error('Erro ao buscar posição quartil:', err);
            setPosicaoQuartilPorDia([]);
            setEstatisticasQuartis({});
        }
    };

    // Calcular porcentagem de dias que cada agente ficou em cada quartil
    const calcularEstatisticasQuartis = (dadosPivotados, agentes) => {
        const stats = {};
        
        agentes.forEach(ag => {
            const contadores = { q1: 0, q2: 0, q3: 0, q4: 0 };
            let totalDias = 0;
            
            dadosPivotados.forEach(row => {
                const quartil = row[ag];
                if (quartil !== null && quartil !== undefined) {
                    totalDias++;
                    if (quartil === 1) contadores.q1++;
                    else if (quartil === 2) contadores.q2++;
                    else if (quartil === 3) contadores.q3++;
                    else if (quartil === 4) contadores.q4++;
                }
            });
            
            if (totalDias > 0) {
                stats[ag] = {
                    q1: Math.round((contadores.q1 / totalDias) * 100),
                    q2: Math.round((contadores.q2 / totalDias) * 100),
                    q3: Math.round((contadores.q3 / totalDias) * 100),
                    q4: Math.round((contadores.q4 / totalDias) * 100),
                    totalDias
                };
            }
        });
        
        setEstatisticasQuartis(stats);
    };

    // Buscar dados de quartis (silent = true para polling sem mostrar loading)
    const buscarDados = async (apenasFixosParam = null, startDateOverride = null, endDateOverride = null, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            const dataInicio = startDateOverride ?? startDate;
            const dataFim = endDateOverride ?? endDate;
            if (dataInicio) params.append('startDate', dataInicio);
            if (dataFim) params.append('endDate', dataFim);
            // Usar o parâmetro passado ou o estado atual
            const apenasFixosValue = apenasFixosParam !== null ? apenasFixosParam : apenasFixos;
            if (apenasFixosValue) params.append('apenasFixos', 'true');
            params.append('_t', Date.now()); // Evitar cache para sempre comparar dados frescos

            const response = await fetch(`${API_ENDPOINTS.quartis}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    processarNovosDados(data);
                    // Buscar DDA por dia (gráfico de linha) com os mesmos filtros e agentes selecionados
                    fetchDdaPorDia(dataInicio, dataFim, apenasFixosValue, agentesEvolucao);
                    // Buscar posição quartil por dia (navegação) quando há agentes selecionados e período definido
                    if (agentesEvolucao.length > 0 && dataInicio && dataFim) {
                        fetchPosicaoQuartilPorDia(dataInicio, dataFim, apenasFixosValue, agentesEvolucao);
                    } else {
                        setPosicaoQuartilPorDia([]);
                    }
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
            if (!silent) {
                if (error.message.includes('JSON')) {
                    alert('Erro: O servidor retornou uma resposta inválida. Verifique se o servidor está rodando e se a rota está disponível.');
                } else {
                    alert('Erro ao buscar dados de quartis: ' + error.message);
                }
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Refetch gráficos de linha e navegação quando mudar seleção de agentes
    useEffect(() => {
        if (!dados) return;
        const dataInicio = startDate || obterDiaAtual().startDate;
        const dataFim = endDate || obterDiaAtual().endDate;
        fetchDdaPorDia(dataInicio, dataFim, apenasFixos, agentesEvolucao);
        if (agentesEvolucao.length > 0 && dataInicio && dataFim) {
            fetchPosicaoQuartilPorDia(dataInicio, dataFim, apenasFixos, agentesEvolucao);
        } else {
            setPosicaoQuartilPorDia([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agentesEvolucao]);

    // Polling: "escuta" alterações no banco a cada 2 min - quando dados mudam, animação dispara
    const POLLING_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos
    useEffect(() => {
        if (!dados) return; // Só começar após primeira carga
        const intervalId = setInterval(() => {
            const dataInicio = startDate || obterDiaAtual().startDate;
            const dataFim = endDate || obterDiaAtual().endDate;
            buscarDados(apenasFixos, dataInicio, dataFim, true); // silent = true
        }, POLLING_INTERVAL_MS);
        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dados, startDate, endDate, apenasFixos]);

    // Auto‑reload a cada 40 minutos, sempre com dia atual e agentes fixos
    useEffect(() => {
        const intervalId = setInterval(() => {
            const { startDate: inicioDia, endDate: fimDia } = obterDiaAtual();
            setApenasFixos(true);
            setStartDate(inicioDia);
            setEndDate(fimDia);
            // Recarregar dados com dia atual e agentes fixos
            buscarDados(true, inicioDia, fimDia);
        }, 40 * 60 * 1000); // 40 minutos em milissegundos

        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Função para obter o dia atual (para carga inicial e reload)
    const obterDiaAtual = () => {
        const hoje = new Date();
        const formatarData = (data) => {
            const ano = data.getFullYear();
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const dia = String(data.getDate()).padStart(2, '0');
            return `${ano}-${mes}-${dia}`;
        };
        const hojeFormatado = formatarData(hoje);
        return {
            startDate: hojeFormatado,
            endDate: hojeFormatado
        };
    };

    // Inicializar com dia atual e agentes fixos
    useEffect(() => {
        const { startDate: inicioDia, endDate: fimDia } = obterDiaAtual();
        setStartDate(inicioDia);
        setEndDate(fimDia);
        
        // Buscar dados do dia atual com agentes fixos
        const buscarDadosInicial = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const params = new URLSearchParams();
                params.append('startDate', inicioDia);
                params.append('endDate', fimDia);
                params.append('apenasFixos', 'true');
                params.append('_t', Date.now());

                const response = await fetch(`${API_ENDPOINTS.quartis}?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        processarNovosDados(data);
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

        buscarDadosInicial();
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
            case 'dia-atual':
                // Quartil apenas do dia corrente
                const hojeFormatado = formatarData(hoje);
                novaStartDate = hojeFormatado;
                novaEndDate = hojeFormatado;
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
            params.append('_t', Date.now());

            const response = await fetch(`${API_ENDPOINTS.quartis}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        processarNovosDados(data);
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
                            <button
                                onClick={() => aplicarFiltroRapido('dia-atual')}
                                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                            >
                                Dia Atual
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
                    const renderizarQuartil = (quartil, quartilNum, corHex, corBg, corBorda, corTexto, titulo, Icone) => {
                        return (
                            <div className={`border-2 ${corBorda} rounded-xl ${corBg} p-4 flex flex-col`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className={`text-lg font-bold ${corTexto} flex items-center gap-2`}>
                                        {Icone && <Icone className="w-5 h-5" style={{ color: corHex }} />}
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
                                        const agenteKey = normalizarAgente(agente.agente);
                                        const movimento = agentesMovidos[agenteKey];
                                        const fezMaisAcordos = movimento?.fezMaisAcordos;
                                        const rowKey = fezMaisAcordos ? `${agenteKey}-${idx}-anim-${animacaoKey}` : `${agenteKey}-${idx}`;
                                        
                                        return (
                                            <div
                                                key={rowKey}
                                                className={`flex items-center gap-2 p-2 rounded-lg bg-white border ${corBorda} hover:shadow-sm transition-shadow`}
                                            >
                                                <span className={`text-xs w-8 font-bold ${corTexto} text-center`}>#{idx + 1}</span>
                                                <span className="text-sm w-12 font-semibold text-slate-800">
                                                    {extrairNumeroAgente(agente.agente)}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="h-4 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${Math.max(percentualDDA, 8)}%`,
                                                                backgroundColor: corHex,
                                                                opacity: 0.9,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className={`text-lg font-semibold text-slate-800 w-16 text-right ${fezMaisAcordos ? 'quartis-animate-text' : ''}`}>
                                                    {quantidadeDDA.toLocaleString('pt-BR')}
                                                </span>
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

                            {/* Card de Quantidade Total Geral + Última Atualização */}
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
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                                    <div className="absolute top-4 right-4">
                                        <Trophy className="w-8 h-8 text-green-500 opacity-20" />
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-green-500" />
                                            1º Quartil
                                        </h3>
                                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {dados.estatisticas.quartil1.total.toLocaleString('pt-BR')}
                                    </p>
                                    <p className="text-sm text-slate-500">Quantidade de DDA</p>
                                    <p className="text-lg font-semibold text-green-600 mt-2">
                                        {percentualQuartil1.toFixed(2)}%
                                    </p>
                                    <p className="text-base font-semibold text-slate-800 mt-1">
                                        {dados.quartil1.length} agente{dados.quartil1.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                                    <div className="absolute top-4 right-4">
                                        <Star className="w-8 h-8 text-blue-500 opacity-20" />
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                            <Star className="w-5 h-5 text-blue-500" />
                                            2º Quartil
                                        </h3>
                                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {dados.estatisticas.quartil2.total.toLocaleString('pt-BR')}
                                    </p>
                                    <p className="text-sm text-slate-500">Quantidade de DDA</p>
                                    <p className="text-lg font-semibold text-blue-600 mt-2">
                                        {percentualQuartil2.toFixed(2)}%
                                    </p>
                                    <p className="text-base font-semibold text-slate-600 mt-1">
                                        {dados.quartil2.length} agente{dados.quartil2.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                                    <div className="absolute top-4 right-4">
                                        <AlertTriangle className="w-8 h-8 text-yellow-500 opacity-20" />
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                            3º Quartil
                                        </h3>
                                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {dados.estatisticas.quartil3.total.toLocaleString('pt-BR')}
                                    </p>
                                    <p className="text-sm text-slate-500">Quantidade de DDA</p>
                                    <p className="text-lg font-semibold text-yellow-600 mt-2">
                                        {percentualQuartil3.toFixed(2)}%
                                    </p>
                                    <p className="text-base font-semibold text-slate-600 mt-1">
                                        {dados.quartil3.length} agente{dados.quartil3.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                                    <div className="absolute top-4 right-4">
                                        <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                            4º Quartil
                                        </h3>
                                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {dados.estatisticas.quartil4.total.toLocaleString('pt-BR')}
                                    </p>
                                    <p className="text-sm text-slate-500">Quantidade de DDA</p>
                                    <p className="text-lg font-semibold text-red-600 mt-2">
                                        {percentualQuartil4.toFixed(2)}%
                                    </p>
                                    <p className="text-base font-semibold text-slate-600 mt-1">
                                        {dados.quartil4.length} agente{dados.quartil4.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Régua Visual de Quartis - Grid 2x2 */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                    <h3 className="text-lg font-semibold text-slate-800">Quartis - Ranking de Agentes</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setModalAtualizacaoAberto(true)}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                                            title="Ver detalhes da atualização"
                                        >
                                            <Info className="w-4 h-4 text-slate-500" />
                                            <span>Última atualização:</span>
                                            <span className="font-semibold">
                                                {ultimaAtualizacao
                                                    ? ultimaAtualizacao.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                                                    : '-'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {renderizarQuartil(dados.quartil1, 1, '#10b981', 'bg-green-50', 'border-green-300', 'text-green-800', '1º Quartil - Top agentes', Trophy)}
                                    {renderizarQuartil(dados.quartil2, 2, '#3b82f6', 'bg-blue-50', 'border-blue-300', 'text-blue-800', '2º Quartil - Bom', Star)}
                                    {renderizarQuartil(dados.quartil3, 3, '#f59e0b', 'bg-yellow-50', 'border-yellow-300', 'text-yellow-800', '3º Quartil - Atenção', AlertTriangle)}
                                    {renderizarQuartil(dados.quartil4, 4, '#ef4444', 'bg-red-50', 'border-red-300', 'text-red-800', '4º Quartil - ALERTA!', AlertCircle)}
                                </div>
                            </div>

                            {/* Gráfico de linha: DDA por dia / Evolução por agente */}
                            {(() => {
                                const todosAgentes = [
                                    ...(dados.quartil1 || []),
                                    ...(dados.quartil2 || []),
                                    ...(dados.quartil3 || []),
                                    ...(dados.quartil4 || []),
                                ];
                                const listaAgentesUnicos = todosAgentes.reduce((acc, a) => {
                                    const num = normalizarAgente(a.agente);
                                    if (num && !acc.some(x => x.numero === num)) acc.push({ numero: num, display: a.agente });
                                    return acc;
                                }, []);
                                const modoEvolucao = agentesEvolucao.length > 0;
                                return (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                                        <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-blue-600" />
                                            {modoEvolucao ? 'Evolução dos agentes (DDA por dia)' : 'DDA por dia'}
                                        </h3>
                                        <div className="mb-4">
                                            <p className="text-sm text-slate-600 mb-2">Filtrar evolução por agente (opcional):</p>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                {listaAgentesUnicos.map(({ numero, display }) => {
                                                    const selecionado = agentesEvolucao.includes(numero);
                                                    return (
                                                        <label
                                                            key={numero}
                                                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                                                                selecionado
                                                                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                                                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selecionado}
                                                                onChange={() => {
                                                                    setAgentesEvolucao(prev =>
                                                                        prev.includes(numero)
                                                                            ? prev.filter(a => a !== numero)
                                                                            : [...prev, numero]
                                                                    );
                                                                }}
                                                                className="sr-only"
                                                            />
                                                            <span>Agente {numero}</span>
                                                        </label>
                                                    );
                                                })}
                                                {agentesEvolucao.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setAgentesEvolucao([])}
                                                        className="text-sm text-slate-500 hover:text-slate-700 underline"
                                                    >
                                                        Limpar
                                                    </button>
                                                )}
                                            </div>
                                            {modoEvolucao && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Mostrando evolução de {agentesEvolucao.length} agente(s). Desmarque todos para ver o total geral.
                                                </p>
                                            )}
                                        </div>
                                        {ddaPorDia.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={320}>
                                                <LineChart data={ddaPorDia} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis
                                                        dataKey="data"
                                                        tickFormatter={(val) => val ? val.split('-').reverse().join('/') : ''}
                                                        stroke="#64748b"
                                                        style={{ fontSize: 12 }}
                                                    />
                                                    <YAxis stroke="#64748b" style={{ fontSize: 12 }} allowDecimals={false} />
                                                    <Tooltip
                                                        formatter={(value) => [value, 'DDA']}
                                                        labelFormatter={(label) => label ? `Data: ${label.split('-').reverse().join('/')}` : ''}
                                                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                                                    />
                                                    {modoEvolucao ? (
                                                        <>
                                                            <Legend />
                                                            {agentesEvolucao.map((ag, idx) => (
                                                                <Line
                                                                    key={ag}
                                                                    type="monotone"
                                                                    dataKey={ag}
                                                                    name={`Agente ${ag}`}
                                                                    stroke={CORES_EVOLUCAO[idx % CORES_EVOLUCAO.length]}
                                                                    strokeWidth={2}
                                                                    dot={{ r: 4 }}
                                                                    activeDot={{ r: 6 }}
                                                                />
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <Line
                                                            type="monotone"
                                                            dataKey="total"
                                                            name="DDA"
                                                            stroke="#3b82f6"
                                                            strokeWidth={2}
                                                            dot={{ fill: '#3b82f6', r: 4 }}
                                                            activeDot={{ r: 6, fill: '#2563eb' }}
                                                        />
                                                    )}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <p className="text-slate-500 text-sm py-8 text-center">
                                                Nenhum dado por dia no período. Defina um intervalo de datas e clique em Buscar.
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Gráfico Navegação do agente (quartil 1-4 por dia) */}
                            {agentesEvolucao.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                        <Compass className="w-5 h-5 text-emerald-600" />
                                        Navegação do agente no período
                                    </h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Posição no quartil (1º = melhor) dia a dia. Verifique se o agente se manteve no 1º quartil.
                                    </p>
                                    {!(startDate && endDate) ? (
                                        <p className="text-slate-500 text-sm py-8 text-center">
                                            Defina data inicial e final e clique em Buscar para ver a navegação.
                                        </p>
                                    ) : posicaoQuartilPorDia.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={320}>
                                            <LineChart data={posicaoQuartilPorDia} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                                                {/* Faixas coloridas de fundo para cada quartil (mesmas cores dos cards) */}
                                                <ReferenceArea y1={0.5} y2={1.5} fill="#10b981" fillOpacity={0.1} />
                                                <ReferenceArea y1={1.5} y2={2.5} fill="#3b82f6" fillOpacity={0.1} />
                                                <ReferenceArea y1={2.5} y2={3.5} fill="#f59e0b" fillOpacity={0.1} />
                                                <ReferenceArea y1={3.5} y2={4.5} fill="#ef4444" fillOpacity={0.1} />
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="data"
                                                    tickFormatter={(val) => val ? val.split('-').reverse().join('/') : ''}
                                                    stroke="#64748b"
                                                    style={{ fontSize: 12 }}
                                                />
                                                <YAxis
                                                    domain={[0.5, 4.5]}
                                                    ticks={[1, 2, 3, 4]}
                                                    tickFormatter={(v) => `${v}º Q`}
                                                    stroke="#64748b"
                                                    style={{ fontSize: 12 }}
                                                    allowDecimals={false}
                                                    reversed={true}
                                                />
                                                <Tooltip
                                                    content={({ active, payload, label }) => {
                                                        if (!active || !payload || payload.length === 0) return null;
                                                        return (
                                                            <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                                                                <p className="text-sm font-semibold text-slate-800 mb-1">
                                                                    Data: {label ? label.split('-').reverse().join('/') : ''}
                                                                </p>
                                                                {payload.map((entry, idx) => {
                                                                    const ag = entry.dataKey;
                                                                    const quartil = entry.value;
                                                                    const dda = entry.payload[`${ag}_dda`] || 0;
                                                                    return (
                                                                        <p key={idx} className="text-sm text-slate-700">
                                                                            <span style={{ color: entry.color }} className="font-semibold">
                                                                                Agente {ag}:
                                                                            </span>
                                                                            {` ${quartil}º quartil (${dda} DDA)`}
                                                                        </p>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                <Legend />
                                                {agentesEvolucao.map((ag, idx) => {
                                                    const cor = CORES_EVOLUCAO[idx % CORES_EVOLUCAO.length];
                                                    return (
                                                        <Line
                                                            key={ag}
                                                            type="monotone"
                                                            dataKey={ag}
                                                            name={`Agente ${ag}`}
                                                            stroke="transparent"
                                                            strokeWidth={0}
                                                            dot={(props) => {
                                                                const { cx, cy, payload } = props;
                                                                const dda = payload[`${ag}_dda`] || 0;
                                                                return (
                                                                    <g>
                                                                        <circle cx={cx} cy={cy} r={8} fill={cor} stroke="#fff" strokeWidth={2} />
                                                                        <text
                                                                            x={cx}
                                                                            y={cy}
                                                                            textAnchor="middle"
                                                                            dominantBaseline="central"
                                                                            fill="#fff"
                                                                            fontSize={10}
                                                                            fontWeight="bold"
                                                                        >
                                                                            {dda}
                                                                        </text>
                                                                    </g>
                                                                );
                                                            }}
                                                            activeDot={{ r: 10 }}
                                                            connectNulls={false}
                                                        />
                                                    );
                                                })}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-slate-500 text-sm py-8 text-center">
                                            Nenhum dado de posição no período. Verifique se há DDA nos dias selecionados.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Estatísticas de porcentagem de dias em cada quartil */}
                            {agentesEvolucao.length > 0 && Object.keys(estatisticasQuartis).length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-blue-600" />
                                        Distribuição de dias por quartil
                                    </h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Porcentagem de dias que cada agente permaneceu em cada quartil durante o período selecionado.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {agentesEvolucao.map((ag, idx) => {
                                            const stats = estatisticasQuartis[ag];
                                            if (!stats) return null;
                                            const cor = CORES_EVOLUCAO[idx % CORES_EVOLUCAO.length];
                                            
                                            return (
                                                <div key={ag} className="border border-slate-200 rounded-lg p-4">
                                                    <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                        <span 
                                                            className="w-3 h-3 rounded-full" 
                                                            style={{ backgroundColor: cor }}
                                                        ></span>
                                                        Agente {ag}
                                                        <span className="text-xs text-slate-500 font-normal ml-auto">
                                                            ({stats.totalDias} dias)
                                                        </span>
                                                    </h4>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-slate-700 flex items-center gap-2">
                                                                <span className="w-3 h-3 rounded-sm bg-green-500"></span>
                                                                1º Quartil
                                                            </span>
                                                            <span className="text-sm font-semibold text-green-700">
                                                                {stats.q1}%
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-slate-700 flex items-center gap-2">
                                                                <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
                                                                2º Quartil
                                                            </span>
                                                            <span className="text-sm font-semibold text-blue-700">
                                                                {stats.q2}%
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-slate-700 flex items-center gap-2">
                                                                <span className="w-3 h-3 rounded-sm bg-yellow-500"></span>
                                                                3º Quartil
                                                            </span>
                                                            <span className="text-sm font-semibold text-yellow-700">
                                                                {stats.q3}%
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-slate-700 flex items-center gap-2">
                                                                <span className="w-3 h-3 rounded-sm bg-red-500"></span>
                                                                4º Quartil
                                                            </span>
                                                            <span className="text-sm font-semibold text-red-700">
                                                                {stats.q4}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Barra de progresso visual */}
                                                    <div className="mt-3 h-2 rounded-full overflow-hidden flex">
                                                        {stats.q1 > 0 && (
                                                            <div 
                                                                className="bg-green-500" 
                                                                style={{ width: `${stats.q1}%` }}
                                                                title={`1º Q: ${stats.q1}%`}
                                                            ></div>
                                                        )}
                                                        {stats.q2 > 0 && (
                                                            <div 
                                                                className="bg-blue-500" 
                                                                style={{ width: `${stats.q2}%` }}
                                                                title={`2º Q: ${stats.q2}%`}
                                                            ></div>
                                                        )}
                                                        {stats.q3 > 0 && (
                                                            <div 
                                                                className="bg-yellow-500" 
                                                                style={{ width: `${stats.q3}%` }}
                                                                title={`3º Q: ${stats.q3}%`}
                                                            ></div>
                                                        )}
                                                        {stats.q4 > 0 && (
                                                            <div 
                                                                className="bg-red-500" 
                                                                style={{ width: `${stats.q4}%` }}
                                                                title={`4º Q: ${stats.q4}%`}
                                                            ></div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Modal Última Atualização */}
                            {modalAtualizacaoAberto && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalAtualizacaoAberto(false)}>
                                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <Info className="w-5 h-5 text-blue-600" />
                                                Informações da Atualização
                                            </h3>
                                            <button
                                                onClick={() => setModalAtualizacaoAberto(false)}
                                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <X className="w-5 h-5 text-slate-500" />
                                            </button>
                                        </div>
                                        <div className="space-y-3 text-slate-600">
                                            <p>
                                                <span className="font-semibold text-slate-800">Última atualização:</span>{' '}
                                                {ultimaAtualizacao
                                                    ? ultimaAtualizacao.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'medium' })
                                                    : 'Nenhuma carga realizada ainda'}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                Os dados são atualizados automaticamente a cada 40 minutos ou ao clicar em Buscar.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}
            </section>
        </div>
    );
};

export default Quartis;

