import React, { useState, useEffect, Fragment } from 'react';
import { API_ENDPOINTS } from '../config/api';
import Loading from '../components/Loading';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const Comparativo = () => {
    const [loading, setLoading] = useState(false);
    const [dados, setDados] = useState(null);
    const [agentes, setAgentes] = useState([]);
    
    // Função para gerar períodos padrão (maio a dezembro de 2025)
    const gerarPeriodosPadrao = () => {
        const meses = [
            { id: 1, mes: '2025-05' }, // Maio
            { id: 2, mes: '2025-06' }, // Junho
            { id: 3, mes: '2025-07' }, // Julho
            { id: 4, mes: '2025-08' }, // Agosto
            { id: 5, mes: '2025-09' }, // Setembro
            { id: 6, mes: '2025-10' }, // Outubro
            { id: 7, mes: '2025-11' }, // Novembro
            { id: 8, mes: '2025-12' }  // Dezembro
        ];
        return meses;
    };

    // Função para carregar dados do localStorage
    const carregarDoLocalStorage = () => {
        try {
            const periodosSalvos = localStorage.getItem('comparativo_periodos');
            const filtrosSalvos = localStorage.getItem('comparativo_filtros');
            
            return {
                periodos: periodosSalvos ? JSON.parse(periodosSalvos) : gerarPeriodosPadrao(),
                filtros: filtrosSalvos ? JSON.parse(filtrosSalvos) : {
                    bloco: 'all',
                    clientesVirgens: false,
                    agenteId: '',
                    groupBy: 'day'
                }
            };
        } catch (error) {
            console.error('Erro ao carregar do localStorage:', error);
            return {
                periodos: gerarPeriodosPadrao(),
                filtros: {
                    bloco: 'all',
                    clientesVirgens: false,
                    agenteId: '',
                    groupBy: 'day'
                }
            };
        }
    };

    // Função para salvar no localStorage
    const salvarNoLocalStorage = (periodosParaSalvar, filtrosParaSalvar) => {
        try {
            localStorage.setItem('comparativo_periodos', JSON.stringify(periodosParaSalvar));
            localStorage.setItem('comparativo_filtros', JSON.stringify(filtrosParaSalvar));
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
        }
    };

    // Carregar dados iniciais do localStorage
    const dadosIniciais = carregarDoLocalStorage();
    
    // Filtros
    const [bloco, setBloco] = useState(dadosIniciais.filtros.bloco);
    const [clientesVirgens, setClientesVirgens] = useState(dadosIniciais.filtros.clientesVirgens);
    const [agenteId, setAgenteId] = useState(dadosIniciais.filtros.agenteId);
    const [groupBy, setGroupBy] = useState(dadosIniciais.filtros.groupBy);
    
    // Períodos dinâmicos - carregar do localStorage ou usar padrão
    const [periodos, setPeriodos] = useState(dadosIniciais.periodos);
    
    // Estado para controlar quais períodos estão visíveis no gráfico diário
    const [periodosVisiveis, setPeriodosVisiveis] = useState(() => {
        // Inicializar todos os períodos como visíveis
        if (dadosIniciais.periodos && dadosIniciais.periodos.length > 0) {
            const visiveis = {};
            dadosIniciais.periodos.forEach(p => {
                visiveis[p.id] = true;
            });
            return visiveis;
        }
        return {};
    });
    
    // Estado para controlar o tipo de visualização (linha ou barra)
    const [tipoVisualizacao, setTipoVisualizacao] = useState('linha'); // 'linha' ou 'barra'

    // Função para converter mês (YYYY-MM) em startDate e endDate
    const mesParaDatas = (mes) => {
        if (!mes) return { startDate: '', endDate: '' };
        const [ano, mesNum] = mes.split('-');
        const primeiroDia = new Date(parseInt(ano), parseInt(mesNum) - 1, 1);
        const ultimoDia = new Date(parseInt(ano), parseInt(mesNum), 0);
        
        const startDate = primeiroDia.toISOString().split('T')[0];
        const endDate = ultimoDia.toISOString().split('T')[0];
        
        return { startDate, endDate };
    };

    // Função para gerar nome do período a partir do mês
    const gerarNomePeriodo = (mes) => {
        if (!mes) return '';
        const [ano, mesNum] = mes.split('-');
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return `${meses[parseInt(mesNum) - 1]}/${ano}`;
    };

    // Carregar lista de agentes
    useEffect(() => {
        const fetchAgentes = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(API_ENDPOINTS.comparativoAgentes, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setAgentes(data);
                }
            } catch (error) {
                console.error('Erro ao carregar agentes:', error);
            }
        };
        fetchAgentes();
    }, []);

    // Adicionar novo período
    const adicionarPeriodo = () => {
        const novoId = Math.max(...periodos.map(p => p.id), 0) + 1;
        const novoPeriodo = {
            id: novoId,
            mes: ''
        };
        const novosPeriodos = [...periodos, novoPeriodo];
        // Ordenar por mês crescente
        const periodosOrdenados = ordenarPeriodosPorMes(novosPeriodos);
        setPeriodos(periodosOrdenados);
        salvarNoLocalStorage(periodosOrdenados, { bloco, clientesVirgens, agenteId, groupBy });
    };

    // Ordenar períodos por mês crescente
    const ordenarPeriodosPorMes = (periodosArray) => {
        return [...periodosArray].sort((a, b) => {
            if (!a.mes || !b.mes) return 0;
            return a.mes.localeCompare(b.mes);
        });
    };

    // Remover período
    const removerPeriodo = (id) => {
        if (periodos.length <= 1) {
            alert('É necessário ter pelo menos um período para comparar');
            return;
        }
        const novosPeriodos = periodos.filter(p => p.id !== id);
        setPeriodos(novosPeriodos);
        salvarNoLocalStorage(novosPeriodos, { bloco, clientesVirgens, agenteId, groupBy });
    };

    // Atualizar período
    const atualizarPeriodo = (id, campo, valor) => {
        const periodosAtualizados = periodos.map(p => 
            p.id === id ? { ...p, [campo]: valor } : p
        );
        // Ordenar por mês crescente após atualização
        const periodosOrdenados = ordenarPeriodosPorMes(periodosAtualizados);
        setPeriodos(periodosOrdenados);
        salvarNoLocalStorage(periodosOrdenados, { bloco, clientesVirgens, agenteId, groupBy });
    };

    // Buscar dados comparativos
    const buscarDados = async () => {
        // Validar períodos e converter mês para datas
        const periodosValidos = periodos
            .filter(p => p.mes && p.mes.trim() !== '')
            .map(p => {
                const { startDate, endDate } = mesParaDatas(p.mes);
                return {
                    id: p.id,
                    startDate,
                    endDate,
                    nome: gerarNomePeriodo(p.mes)
                };
            });
            
        console.log('📊 Buscar dados - Períodos selecionados:', periodos.length);
        console.log('📊 Buscar dados - Períodos válidos:', periodosValidos.length);
        periodosValidos.forEach((p, idx) => {
            console.log(`   Período ${idx + 1}: ${p.nome} (${p.startDate} até ${p.endDate})`);
        });
            
        // Se não houver períodos válidos, limpar dados e não fazer busca
        if (periodosValidos.length === 0) {
            setDados(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                periodos: JSON.stringify(periodosValidos),
                bloco,
                clientesVirgens: clientesVirgens.toString(),
                groupBy,
            });
            if (agenteId) {
                params.append('agenteId', agenteId);
            }

            console.log('📤 Enviando requisição com', periodosValidos.length, 'períodos para o backend');
            console.log('📤 URL completa:', `${API_ENDPOINTS.comparativo}?${params}`);
            console.log('📤 Parâmetros:', {
                periodos: periodosValidos,
                bloco,
                clientesVirgens,
                groupBy,
                agenteId
            });

            const response = await fetch(`${API_ENDPOINTS.comparativo}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('📥 Status da resposta:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('📥 Dados recebidos do backend');
                console.log('   Total de períodos retornados:', data.periodos?.length || 0);
                console.log('   Estrutura completa dos dados:', data);
                if (data.periodos) {
                    // Ordenar períodos por data antes de salvar
                    data.periodos.sort((a, b) => {
                        return a.startDate.localeCompare(b.startDate);
                    });
                    
                    data.periodos.forEach((p, idx) => {
                        console.log(`   📊 Período ${idx + 1}: ${p.nome} (${p.startDate})`);
                        console.log(`      - Registros: ${p.dados?.length || 0}`);
                        console.log(`      - Agentes: ${p.agentes?.length || 0}`);
                    });
                } else {
                    console.warn('⚠️ Nenhum período retornado do backend');
                }
                setDados(data);
            } else {
                let error;
                try {
                    error = await response.json();
                } catch (e) {
                    error = { message: `Erro HTTP ${response.status}: ${response.statusText}` };
                }
                console.error('❌ Erro na resposta:', error);
                console.error('❌ Status:', response.status);
                console.error('❌ Status Text:', response.statusText);
                alert(`Erro: ${error.message || 'Erro ao buscar dados'}`);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar comparativo:', error);
            console.error('❌ Stack trace:', error.stack);
            alert(`Erro ao buscar dados comparativos: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    // Buscar dados quando os filtros ou períodos mudarem (com debounce)
    useEffect(() => {
        // Verificar se há pelo menos um período válido antes de buscar
        const periodosValidos = periodos.filter(p => p.mes && p.mes.trim() !== '');
        
        if (periodosValidos.length === 0) {
            // Se não houver períodos válidos, limpar dados e não buscar
            setDados(null);
            setLoading(false);
            return;
        }
        
        const timer = setTimeout(() => {
            buscarDados();
        }, 500); // Aguardar 500ms após última mudança
        
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bloco, clientesVirgens, agenteId, groupBy, periodos]);

    // Calcular totais para cada período
    const calcularTotais = (periodo) => {
        if (!periodo || !periodo.dados) return null;
        
        return periodo.dados.reduce((acc, item) => ({
            clientes_unicos_cobrados: acc.clientes_unicos_cobrados + (item.clientes_unicos_cobrados || 0),
            numero_acordos: acc.numero_acordos + (item.numero_acordos || 0),
            valor_total_cobrado: acc.valor_total_cobrado + (item.valor_total_cobrado || 0),
            valor_total_recuperado: acc.valor_total_recuperado + (item.valor_total_recuperado || 0),
        }), {
            clientes_unicos_cobrados: 0,
            numero_acordos: 0,
            valor_total_cobrado: 0,
            valor_total_recuperado: 0,
        });
    };

    // Calcular totais para todos os períodos
    // IMPORTANTE: Garantir que TODOS os períodos sejam incluídos, mesmo que não tenham dados
    // E ordenar por data cronologicamente
    const totaisPeriodos = dados?.periodos ? dados.periodos
        .map((p, idx) => {
            const totais = calcularTotais(p);
            console.log(`📊 Processando período ${idx + 1}: ${p.nome}`, {
                dados: p.dados?.length || 0,
                totais: totais,
                temDados: p.dados && p.dados.length > 0
            });
            return {
                periodo: p,
                totais: totais || {
                    clientes_unicos_cobrados: 0,
                    numero_acordos: 0,
                    valor_total_cobrado: 0,
                    valor_total_recuperado: 0
                }
            };
        })
        .sort((a, b) => {
            // Ordenar por data de início do período (cronologicamente)
            return a.periodo.startDate.localeCompare(b.periodo.startDate);
        }) : [];
    
    // Debug: verificar quantos períodos temos
    console.log('📊 Frontend - Verificação de períodos:');
    console.log(`   - Períodos recebidos do backend: ${dados?.periodos?.length || 0}`);
    console.log(`   - Períodos processados para exibição: ${totaisPeriodos.length}`);
    
    if (dados?.periodos) {
        console.log('📊 Frontend - Períodos que serão exibidos na tabela:');
        totaisPeriodos.forEach((tp, idx) => {
            console.log(`   ${idx + 1}. ${tp.periodo.nome}`, {
                clientes: tp.totais?.clientes_unicos_cobrados || 0,
                acordos: tp.totais?.numero_acordos || 0,
                valorCobrado: tp.totais?.valor_total_cobrado || 0,
                valorRecuperado: tp.totais?.valor_total_recuperado || 0
            });
        });
        
        // Verificar se há discrepância
        if (dados.periodos.length !== totaisPeriodos.length) {
            console.error(`❌ ERRO: Discrepância detectada! Backend retornou ${dados.periodos.length} períodos, mas apenas ${totaisPeriodos.length} foram processados.`);
        }
    } else {
        console.log('⚠️ Frontend - Nenhum dado disponível para processar');
    }
    
    // Debug: verificar quantos períodos temos
    if (dados?.periodos) {
        console.log('📊 Frontend - Total de períodos processados:', totaisPeriodos.length);
        console.log('📊 Frontend - Períodos que serão exibidos na tabela:');
        totaisPeriodos.forEach((tp, idx) => {
            console.log(`   ${idx + 1}. ${tp.periodo.nome}`, {
                clientes: tp.totais?.clientes_unicos_cobrados || 0,
                acordos: tp.totais?.numero_acordos || 0,
                valorCobrado: tp.totais?.valor_total_cobrado || 0,
                valorRecuperado: tp.totais?.valor_total_recuperado || 0
            });
        });
    }

    // Calcular percentuais para cada período
    const calcularPercentuais = (totais) => {
        if (!totais) return { percentAcordos: '0.00', percentRecuperado: '0.00' };
        const percentAcordos = totais.clientes_unicos_cobrados > 0 
            ? ((totais.numero_acordos / totais.clientes_unicos_cobrados) * 100).toFixed(2) 
            : '0.00';
        const percentRecuperado = totais.valor_total_cobrado > 0 
            ? ((totais.valor_total_recuperado / totais.valor_total_cobrado) * 100).toFixed(2) 
            : '0.00';
        return { percentAcordos, percentRecuperado };
    };

    return (
        <div className="space-y-6 px-4">
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Comparativo de Períodos</h2>
                        <p className="text-slate-500">Análise comparativa de produção entre múltiplos períodos</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Filtros</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Filtro 1: Por Bloco */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Filtro 1: Por Bloco
                            </label>
                            <select
                                value={bloco}
                                onChange={(e) => {
                                    const novoBloco = e.target.value;
                                    setBloco(novoBloco);
                                    salvarNoLocalStorage(periodos, { bloco: novoBloco, clientesVirgens, agenteId, groupBy });
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">Todos</option>
                                <option value="1">Bloco 1</option>
                                <option value="2">Bloco 2</option>
                                <option value="3">Bloco 3</option>
                                <option value="wo">WO</option>
                            </select>
                        </div>

                        {/* Filtro 2: Clientes Virgens */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Filtro 2: Clientes Virgens
                            </label>
                            <select
                                value={clientesVirgens.toString()}
                                onChange={(e) => {
                                    const novoClientesVirgens = e.target.value === 'true';
                                    setClientesVirgens(novoClientesVirgens);
                                    salvarNoLocalStorage(periodos, { bloco, clientesVirgens: novoClientesVirgens, agenteId, groupBy });
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="false">Todos os clientes</option>
                                <option value="true">Apenas clientes virgens</option>
                            </select>
                        </div>

                        {/* Filtro 3: Por Agente */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Filtro 3: Por Agente
                            </label>
                            <select
                                value={agenteId}
                                onChange={(e) => {
                                    const novoAgenteId = e.target.value;
                                    setAgenteId(novoAgenteId);
                                    salvarNoLocalStorage(periodos, { bloco, clientesVirgens, agenteId: novoAgenteId, groupBy });
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Todos os agentes</option>
                                {agentes.map(agente => (
                                    <option key={agente.id} value={agente.id}>
                                        {agente.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Agrupamento */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Agrupamento
                            </label>
                            <select
                                value={groupBy}
                                onChange={(e) => {
                                    const novoGroupBy = e.target.value;
                                    setGroupBy(novoGroupBy);
                                    salvarNoLocalStorage(periodos, { bloco, clientesVirgens, agenteId, groupBy: novoGroupBy });
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="day">Dia</option>
                                <option value="week">Semana</option>
                                <option value="month">Mês</option>
                            </select>
                        </div>
                    </div>

                    {/* Períodos Dinâmicos */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-slate-700">
                                Períodos para Comparar
                            </label>
                            <button
                                onClick={adicionarPeriodo}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                + Adicionar Período
                            </button>
                        </div>
                        <div className="space-y-3">
                            {periodos.map((periodo) => {
                                const nomePeriodo = gerarNomePeriodo(periodo.mes);
                                return (
                                    <div key={periodo.id} className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs text-slate-600 mb-1">
                                                {nomePeriodo || 'Selecione o mês'}
                                            </label>
                                            <input
                                                type="month"
                                                value={periodo.mes}
                                                onChange={(e) => atualizarPeriodo(periodo.id, 'mes', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removerPeriodo(periodo.id)}
                                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                            title="Remover período"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {loading && <Loading message="Carregando dados comparativos..." />}

                {dados && dados.periodoDisponivel && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Período sem dados</h4>
                        <p className="text-sm text-yellow-700 mb-2">
                            Não foram encontrados dados para os períodos selecionados. Períodos disponíveis no banco:
                        </p>
                        <ul className="text-sm text-yellow-700 list-disc list-inside">
                            {dados.periodoDisponivel.vuon_resultados && (
                                <li>
                                    <strong>vuon_resultados:</strong> {dados.periodoDisponivel.vuon_resultados.min_date} até {dados.periodoDisponivel.vuon_resultados.max_date} ({dados.periodoDisponivel.vuon_resultados.total.toLocaleString('pt-BR')} registros)
                                </li>
                            )}
                            {dados.periodoDisponivel.vuon_novacoes && (
                                <li>
                                    <strong>vuon_novacoes:</strong> {dados.periodoDisponivel.vuon_novacoes.min_date} até {dados.periodoDisponivel.vuon_novacoes.max_date} ({dados.periodoDisponivel.vuon_novacoes.total.toLocaleString('pt-BR')} registros)
                                </li>
                            )}
                            {dados.periodoDisponivel.recebimentos_por_cobrador && (
                                <li>
                                    <strong>recebimentos_por_cobrador:</strong> {dados.periodoDisponivel.recebimentos_por_cobrador.min_date} até {dados.periodoDisponivel.recebimentos_por_cobrador.max_date} ({dados.periodoDisponivel.recebimentos_por_cobrador.total.toLocaleString('pt-BR')} registros)
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                {dados && dados.periodos && (
                    <>
                        {/* Resumo Comparativo */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumo Comparativo</h3>
                            <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
                                <table className="w-full text-sm" style={{ minWidth: `${Math.max(600, (totaisPeriodos.length + 1) * 200)}px` }}>
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Métrica</th>
                                            {totaisPeriodos.map((tp, idx) => (
                                                <th key={idx} className="text-right py-3 px-4 font-semibold text-slate-700">
                                                    {tp.periodo.nome}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-3 px-4 text-slate-700">Número de clientes únicos cobrados</td>
                                            {totaisPeriodos.map((tp, idx) => (
                                                <td key={idx} className="py-3 px-4 text-right">
                                                    {tp.totais?.clientes_unicos_cobrados.toLocaleString('pt-BR') || 0}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-3 px-4 text-slate-700">Número de acordos</td>
                                            {totaisPeriodos.map((tp, idx) => (
                                                <td key={idx} className="py-3 px-4 text-right">
                                                    {tp.totais?.numero_acordos.toLocaleString('pt-BR') || 0}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-3 px-4 text-slate-700">% de acordos</td>
                                            {totaisPeriodos.map((tp, idx) => {
                                                const percent = calcularPercentuais(tp.totais).percentAcordos;
                                                return (
                                                    <td key={idx} className="py-3 px-4 text-right">
                                                        {percent}%
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-3 px-4 text-slate-700">Valor total cobrado</td>
                                            {totaisPeriodos.map((tp, idx) => (
                                                <td key={idx} className="py-3 px-4 text-right">
                                                    {tp.totais ? `R$ ${tp.totais.valor_total_cobrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-3 px-4 text-slate-700">Valor total recuperado</td>
                                            {totaisPeriodos.map((tp, idx) => (
                                                <td key={idx} className="py-3 px-4 text-right">
                                                    {tp.totais ? `R$ ${tp.totais.valor_total_recuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 text-slate-700">% de valor recuperado</td>
                                            {totaisPeriodos.map((tp, idx) => {
                                                const percent = calcularPercentuais(tp.totais).percentRecuperado;
                                                return (
                                                    <td key={idx} className="py-3 px-4 text-right">
                                                        {percent}%
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Gráficos Comparativos */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Gráfico 1: Clientes Únicos e Acordos */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Clientes Únicos e Acordos</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={totaisPeriodos.map(tp => ({
                                            periodo: tp.periodo.nome,
                                            clientes: tp.totais?.clientes_unicos_cobrados || 0,
                                            acordos: tp.totais?.numero_acordos || 0,
                                        }))}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="periodo" 
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis />
                                        <Tooltip 
                                            formatter={(value) => value.toLocaleString('pt-BR')}
                                        />
                                        <Legend />
                                        <Bar dataKey="clientes" fill="#3b82f6" name="Clientes Únicos" />
                                        <Bar dataKey="acordos" fill="#10b981" name="Acordos" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Gráfico 2: Valores Cobrados e Recuperados */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Valores Cobrados e Recuperados</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={totaisPeriodos.map(tp => ({
                                            periodo: tp.periodo.nome,
                                            cobrado: tp.totais?.valor_total_cobrado || 0,
                                            recuperado: tp.totais?.valor_total_recuperado || 0,
                                        }))}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="periodo" 
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis />
                                        <Tooltip 
                                            formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                        />
                                        <Legend />
                                        <Bar dataKey="cobrado" fill="#f59e0b" name="Valor Cobrado" />
                                        <Bar dataKey="recuperado" fill="#8b5cf6" name="Valor Recuperado" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Gráfico 3: Percentuais */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Percentuais (%)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={totaisPeriodos.map(tp => {
                                            const percent = calcularPercentuais(tp.totais);
                                            return {
                                                periodo: tp.periodo.nome,
                                                percentAcordos: parseFloat(percent.percentAcordos),
                                                percentRecuperado: parseFloat(percent.percentRecuperado),
                                            };
                                        })}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="periodo" 
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis />
                                        <Tooltip 
                                            formatter={(value) => `${value.toFixed(2)}%`}
                                        />
                                        <Legend />
                                        <Bar dataKey="percentAcordos" fill="#06b6d4" name="% Acordos" />
                                        <Bar dataKey="percentRecuperado" fill="#ec4899" name="% Recuperado" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Gráfico 4: Comparativo de Valores (Linha) */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Comparativo de Valores Recuperados</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart
                                        data={totaisPeriodos.map(tp => ({
                                            periodo: tp.periodo.nome,
                                            valorRecuperado: tp.totais?.valor_total_recuperado || 0,
                                            valorCobrado: tp.totais?.valor_total_cobrado || 0,
                                        }))}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="periodo"
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis />
                                        <Tooltip 
                                            formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                        />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="valorCobrado" 
                                            stroke="#f59e0b" 
                                            strokeWidth={2}
                                            name="Valor Cobrado"
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="valorRecuperado" 
                                            stroke="#8b5cf6" 
                                            strokeWidth={2}
                                            name="Valor Recuperado"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gráfico de Agentes */}
                        {dados.periodos && dados.periodos.some(p => p.agentes && p.agentes.length > 0) && (() => {
                            // Se um agente específico foi selecionado, mostrar dados desse agente por período
                            if (agenteId) {
                                const agenteSelecionado = agentes.find(a => a.id.toString() === agenteId.toString());
                                const nomeAgente = agenteSelecionado ? agenteSelecionado.nome : 'Agente Selecionado';
                                
                                console.log('📊 Gráfico de Agente - Agente selecionado:', nomeAgente, 'ID:', agenteId);
                                
                                // Quando um agente é selecionado, os dados já vêm filtrados do backend
                                // Usar os totais de cada período (que já estão filtrados por agente)
                                const dadosAgentePorPeriodo = totaisPeriodos.map((tp) => {
                                    const valor = tp.totais?.valor_total_cobrado || 0;
                                    const acordos = tp.totais?.numero_acordos || 0;
                                    
                                    console.log(`   Período ${tp.periodo.nome}: Valor R$ ${valor.toLocaleString('pt-BR')}, Acordos: ${acordos}`);
                                    
                                    return {
                                        periodo: tp.periodo.nome,
                                        periodoStartDate: tp.periodo.startDate, // Adicionar data para ordenação
                                        valorCobrado: valor,
                                        totalAcordos: acordos
                                    };
                                }).sort((a, b) => {
                                    // Ordenar por data do período (cronologicamente)
                                    return a.periodoStartDate.localeCompare(b.periodoStartDate);
                                });
                                
                                return (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                                        <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                            {nomeAgente} - Evolução por Período
                                        </h3>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart
                                                data={dadosAgentePorPeriodo}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="periodo"
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={80}
                                                />
                                                <YAxis yAxisId="left" />
                                                <YAxis yAxisId="right" orientation="right" />
                                                <Tooltip 
                                                    formatter={(value, name) => {
                                                        if (name === 'valorCobrado') {
                                                            return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                                                        }
                                                        return value.toLocaleString('pt-BR');
                                                    }}
                                                />
                                                <Bar 
                                                    yAxisId="left"
                                                    dataKey="valorCobrado" 
                                                    name="Valor Cobrado (R$)"
                                                    fill="#3b82f6"
                                                />
                                                <Bar 
                                                    yAxisId="right"
                                                    dataKey="totalAcordos" 
                                                    name="Total de Acordos"
                                                    fill="#10b981"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            }
                            
                            // Se nenhum agente foi selecionado, mostrar top 10 agentes
                            // Ordenar períodos por data antes de processar
                            const periodosOrdenados = [...dados.periodos].sort((a, b) => {
                                return a.startDate.localeCompare(b.startDate);
                            });
                            
                            // Coletar todos os agentes únicos de todos os períodos
                            const todosAgentes = new Map();
                            periodosOrdenados.forEach((periodo, periodoIdx) => {
                                (periodo.agentes || []).forEach(agente => {
                                    if (!todosAgentes.has(agente.agente_nome)) {
                                        todosAgentes.set(agente.agente_nome, {
                                            agente_nome: agente.agente_nome
                                        });
                                    }
                                });
                            });
                            
                            // Criar dados do gráfico combinando todos os períodos
                            const dadosGrafico = Array.from(todosAgentes.values()).map(agente => {
                                const entry = { agente_nome: agente.agente_nome };
                                periodosOrdenados.forEach((periodo, idx) => {
                                    const agentePeriodo = (periodo.agentes || []).find(a => a.agente_nome === agente.agente_nome);
                                    entry[`valor_${idx}`] = agentePeriodo ? agentePeriodo.valor_total_cobrado : 0;
                                    entry[`acordos_${idx}`] = agentePeriodo ? agentePeriodo.total_acordos : 0;
                                });
                                return entry;
                            }).sort((a, b) => {
                                // Ordenar pelo maior valor total entre todos os períodos
                                const maxA = Math.max(...periodosOrdenados.map((_, idx) => a[`valor_${idx}`] || 0));
                                const maxB = Math.max(...periodosOrdenados.map((_, idx) => b[`valor_${idx}`] || 0));
                                return maxB - maxA;
                            }).slice(0, 10); // Top 10
                            
                            return (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 10 Agentes - Comparativo por Período</h3>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart
                                            data={dadosGrafico}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis 
                                                dataKey="agente_nome"
                                                angle={-45}
                                                textAnchor="end"
                                                height={120}
                                            />
                                            <YAxis />
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (!active || !payload || !payload.length) return null;
                                                        
                                                        // Criar um array com os dados dos períodos e seus índices
                                                        const periodosComDados = periodosOrdenados.map((periodo, idx) => {
                                                            const entry = payload.find(p => p.dataKey === `valor_${idx}`);
                                                            return {
                                                                periodo: periodo,
                                                                valor: entry?.value || 0,
                                                                color: entry?.color || '#000000',
                                                                idx: idx
                                                            };
                                                        }).filter(item => item.valor > 0 || true); // Incluir todos, mesmo com valor 0
                                                        
                                                        // Ordenar cronologicamente pela data do período
                                                        periodosComDados.sort((a, b) => {
                                                            return a.periodo.startDate.localeCompare(b.periodo.startDate);
                                                        });
                                                        
                                                        return (
                                                            <div className="bg-white p-3 border border-slate-300 rounded shadow-lg">
                                                                <p className="font-semibold mb-2">{payload[0]?.payload?.agente_nome || ''}</p>
                                                                {periodosComDados.map((item, idx) => {
                                                                    return (
                                                                        <p key={idx} style={{ color: item.color }}>
                                                                            {item.periodo.nome} - Valor Cobrado: R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                        </p>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                {periodosOrdenados.map((periodo, idx) => {
                                                    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                                    const cor = cores[idx % cores.length];
                                                    
                                                    return (
                                                        <Bar
                                                            key={periodo.nome}
                                                            dataKey={`valor_${idx}`}
                                                            name={`${periodo.nome} - Valor Cobrado`}
                                                            fill={cor}
                                                        />
                                                    );
                                                })}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            );
                        })()}

                        {/* Gráfico de Comparação Diária entre Meses */}
                        {dados?.periodos && dados.periodos.length > 0 && (() => {
                            // Verificar se há um agente selecionado
                            const agenteSelecionado = agenteId ? agentes.find(a => a.id.toString() === agenteId.toString()) : null;
                            
                            // Preparar dados diários para comparação
                            // Agrupar por dia do mês (1-31) para comparar os mesmos dias de diferentes meses
                            // NOTA: Se um agente estiver selecionado, os dados já vêm filtrados do backend
                            const dadosDiarios = new Map();
                            
                            dados.periodos.forEach((periodo, periodoIdx) => {
                                if (periodo.dados && periodo.dados.length > 0) {
                                    periodo.dados.forEach(item => {
                                        // Extrair o dia do mês da data (assumindo formato DD/MM/YYYY ou similar)
                                        let diaMes = null;
                                        if (item.date) {
                                            // Tentar extrair o dia de diferentes formatos
                                            const dateStr = item.date.toString();
                                            if (dateStr.includes('/')) {
                                                // Formato DD/MM/YYYY
                                                const partes = dateStr.split('/');
                                                diaMes = parseInt(partes[0]);
                                            } else if (dateStr.includes('-')) {
                                                // Formato YYYY-MM-DD
                                                const partes = dateStr.split('-');
                                                diaMes = parseInt(partes[2]);
                                            }
                                        }
                                        
                                        if (diaMes && diaMes >= 1 && diaMes <= 31) {
                                            if (!dadosDiarios.has(diaMes)) {
                                                dadosDiarios.set(diaMes, {
                                                    dia: diaMes,
                                                    periodos: {}
                                                });
                                            }
                                            
                                            const periodoKey = periodo.nome;
                                            dadosDiarios.get(diaMes).periodos[periodoKey] = {
                                                valorCobrado: item.valor_total_cobrado || 0,
                                                valorRecuperado: item.valor_total_recuperado || 0,
                                                acordos: item.numero_acordos || 0,
                                                clientes: item.clientes_unicos_cobrados || 0
                                            };
                                        }
                                    });
                                }
                            });
                            
                            // Converter para array e ordenar por dia
                            const dadosGraficoDiario = Array.from(dadosDiarios.values())
                                .sort((a, b) => a.dia - b.dia)
                                .map(item => {
                                    const entry = { dia: item.dia };
                                    dados.periodos.forEach(periodo => {
                                        const periodoData = item.periodos[periodo.nome];
                                        if (periodoData) {
                                            entry[`${periodo.nome}_valorCobrado`] = periodoData.valorCobrado;
                                            entry[`${periodo.nome}_valorRecuperado`] = periodoData.valorRecuperado;
                                            entry[`${periodo.nome}_acordos`] = periodoData.acordos;
                                            entry[`${periodo.nome}_clientes`] = periodoData.clientes;
                                        } else {
                                            entry[`${periodo.nome}_valorCobrado`] = 0;
                                            entry[`${periodo.nome}_valorRecuperado`] = 0;
                                            entry[`${periodo.nome}_acordos`] = 0;
                                            entry[`${periodo.nome}_clientes`] = 0;
                                        }
                                    });
                                    return entry;
                                });
                            
                            if (dadosGraficoDiario.length === 0) {
                                return null;
                            }
                            
                            // Função para alternar visibilidade de um período
                            const togglePeriodoVisivel = (periodoNome) => {
                                // Encontrar o período correspondente no array de períodos selecionados
                                const periodoSelecionado = periodos.find(p => {
                                    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                                    if (periodoNome.includes('/')) {
                                        const partes = periodoNome.split('/');
                                        const mesNome = partes[0];
                                        const ano = partes[1];
                                        const mesIndex = meses.indexOf(mesNome);
                                        if (mesIndex >= 0) {
                                            const mesAno = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;
                                            return p.mes === mesAno;
                                        }
                                    }
                                    return false;
                                });
                                
                                if (periodoSelecionado) {
                                    setPeriodosVisiveis(prev => ({
                                        ...prev,
                                        [periodoSelecionado.id]: !prev[periodoSelecionado.id]
                                    }));
                                }
                            };
                            
                            // Filtrar períodos visíveis baseado no estado
                            const periodosFiltrados = dados.periodos.filter((periodo) => {
                                // Encontrar o período correspondente no array de períodos selecionados
                                const periodoSelecionado = periodos.find(p => {
                                    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                                    if (periodo.nome.includes('/')) {
                                        const partes = periodo.nome.split('/');
                                        const mesNome = partes[0];
                                        const ano = partes[1];
                                        const mesIndex = meses.indexOf(mesNome);
                                        if (mesIndex >= 0) {
                                            const mesAno = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;
                                            return p.mes === mesAno;
                                        }
                                    }
                                    return false;
                                });
                                
                                // Se não encontrar correspondência, considerar visível por padrão
                                if (!periodoSelecionado) {
                                    return true;
                                }
                                
                                return periodosVisiveis[periodoSelecionado.id] !== false;
                            });
                            
                            return (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">
                                                Comparação Diária entre Meses - Valor Cobrado
                                                {agenteSelecionado && (
                                                    <span className="ml-2 text-sm font-normal text-blue-600">
                                                        (Filtrado por: {agenteSelecionado.nome})
                                                    </span>
                                                )}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {/* Toggle de visualização */}
                                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                                <button
                                                    onClick={() => setTipoVisualizacao('linha')}
                                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                                        tipoVisualizacao === 'linha'
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-slate-600 hover:text-slate-800'
                                                    }`}
                                                >
                                                    Linha
                                                </button>
                                                <button
                                                    onClick={() => setTipoVisualizacao('barra')}
                                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                                        tipoVisualizacao === 'barra'
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-slate-600 hover:text-slate-800'
                                                    }`}
                                                >
                                                    Barra
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                            {dados.periodos.map((periodo, idx) => {
                                                const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                                const cor = cores[idx % cores.length];
                                                
                                                // Encontrar o período correspondente
                                                const periodoSelecionado = periodos.find(p => {
                                                    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                                                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                                                    if (periodo.nome.includes('/')) {
                                                        const partes = periodo.nome.split('/');
                                                        const mesNome = partes[0];
                                                        const ano = partes[1];
                                                        const mesIndex = meses.indexOf(mesNome);
                                                        if (mesIndex >= 0) {
                                                            const mesAno = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;
                                                            return p.mes === mesAno;
                                                        }
                                                    }
                                                    return false;
                                                });
                                                
                                                const isVisible = periodoSelecionado 
                                                    ? periodosVisiveis[periodoSelecionado.id] !== false
                                                    : true;
                                                
                                                return (
                                                    <label key={periodo.nome} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isVisible}
                                                            onChange={() => togglePeriodoVisivel(periodo.nome)}
                                                            className="w-4 h-4 rounded border-slate-300"
                                                        />
                                                        <span 
                                                            className="text-sm font-medium"
                                                            style={{ color: isVisible ? cor : '#94a3b8' }}
                                                        >
                                                            {periodo.nome}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                            </div>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={400}>
                                        {tipoVisualizacao === 'linha' ? (
                                            <LineChart
                                                data={dadosGraficoDiario}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="dia"
                                                    label={{ value: 'Dia do Mês', position: 'insideBottom', offset: -5 }}
                                                />
                                                <YAxis 
                                                    label={{ value: 'Valor (R$)', angle: -90, position: 'insideLeft' }}
                                                />
                                                <Tooltip 
                                                    formatter={(value, name) => {
                                                        if (name.includes('valorCobrado') || name.includes('valorRecuperado')) {
                                                            return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                                                        }
                                                        return value.toLocaleString('pt-BR');
                                                    }}
                                                    labelFormatter={(label) => `Dia ${label}`}
                                                />
                                                {periodosFiltrados.map((periodo, idx) => {
                                                    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                                    const cor = cores[idx % cores.length];
                                                    
                                                    return (
                                                        <Line
                                                            key={`${periodo.nome}_valorCobrado`}
                                                            type="monotone"
                                                            dataKey={`${periodo.nome}_valorCobrado`}
                                                            name={`${periodo.nome} - Valor Cobrado`}
                                                            stroke={cor}
                                                            strokeWidth={2}
                                                            dot={{ r: 4 }}
                                                            activeDot={{ r: 6 }}
                                                        />
                                                    );
                                                })}
                                            </LineChart>
                                        ) : (
                                            <BarChart
                                                data={dadosGraficoDiario}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="dia"
                                                    label={{ value: 'Dia do Mês', position: 'insideBottom', offset: -5 }}
                                                />
                                                <YAxis 
                                                    label={{ value: 'Valor (R$)', angle: -90, position: 'insideLeft' }}
                                                />
                                                <Tooltip 
                                                    formatter={(value, name) => {
                                                        if (name.includes('valorCobrado') || name.includes('valorRecuperado')) {
                                                            return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                                                        }
                                                        return value.toLocaleString('pt-BR');
                                                    }}
                                                    labelFormatter={(label) => `Dia ${label}`}
                                                />
                                                {periodosFiltrados.map((periodo, idx) => {
                                                    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                                    const cor = cores[idx % cores.length];
                                                    
                                                    return (
                                                        <Bar
                                                            key={`${periodo.nome}_valorCobrado`}
                                                            dataKey={`${periodo.nome}_valorCobrado`}
                                                            name={`${periodo.nome} - Valor Cobrado`}
                                                            fill={cor}
                                                        />
                                                    );
                                                })}
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                    
                                    {/* Gráfico de Acordos Diários */}
                                    <div className="flex justify-between items-center mb-4 mt-8">
                                        <h3 className="text-lg font-semibold text-slate-800">
                                            Comparação Diária entre Meses - Número de Acordos
                                            {agenteSelecionado && (
                                                <span className="ml-2 text-sm font-normal text-blue-600">
                                                    (Filtrado por: {agenteSelecionado.nome})
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            {/* Toggle de visualização */}
                                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                                <button
                                                    onClick={() => setTipoVisualizacao('linha')}
                                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                                        tipoVisualizacao === 'linha'
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-slate-600 hover:text-slate-800'
                                                    }`}
                                                >
                                                    Linha
                                                </button>
                                                <button
                                                    onClick={() => setTipoVisualizacao('barra')}
                                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                                        tipoVisualizacao === 'barra'
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-slate-600 hover:text-slate-800'
                                                    }`}
                                                >
                                                    Barra
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={400}>
                                        {tipoVisualizacao === 'linha' ? (
                                            <LineChart
                                                data={dadosGraficoDiario}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="dia"
                                                    label={{ value: 'Dia do Mês', position: 'insideBottom', offset: -5 }}
                                                />
                                                <YAxis 
                                                    label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }}
                                                />
                                                <Tooltip 
                                                    formatter={(value) => value.toLocaleString('pt-BR')}
                                                    labelFormatter={(label) => `Dia ${label}`}
                                                />
                                                {periodosFiltrados.map((periodo, idx) => {
                                                    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                                    const cor = cores[idx % cores.length];
                                                    
                                                    return (
                                                        <Line
                                                            key={`${periodo.nome}_acordos`}
                                                            type="monotone"
                                                            dataKey={`${periodo.nome}_acordos`}
                                                            name={`${periodo.nome} - Acordos`}
                                                            stroke={cor}
                                                            strokeWidth={2}
                                                            dot={{ r: 4 }}
                                                            activeDot={{ r: 6 }}
                                                        />
                                                    );
                                                })}
                                            </LineChart>
                                        ) : (
                                            <BarChart
                                                data={dadosGraficoDiario}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="dia"
                                                    label={{ value: 'Dia do Mês', position: 'insideBottom', offset: -5 }}
                                                />
                                                <YAxis 
                                                    label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }}
                                                />
                                                <Tooltip 
                                                    formatter={(value) => value.toLocaleString('pt-BR')}
                                                    labelFormatter={(label) => `Dia ${label}`}
                                                />
                                                {periodosFiltrados.map((periodo, idx) => {
                                                    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                                    const cor = cores[idx % cores.length];
                                                    
                                                    return (
                                                        <Bar
                                                            key={`${periodo.nome}_acordos`}
                                                            dataKey={`${periodo.nome}_acordos`}
                                                            name={`${periodo.nome} - Acordos`}
                                                            fill={cor}
                                                        />
                                                    );
                                                })}
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            );
                        })()}

                        {/* Tabela Detalhada */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Dados Detalhados</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Data</th>
                                            <th className="text-right py-3 px-4 font-semibold text-slate-700">Clientes Únicos</th>
                                            <th className="text-right py-3 px-4 font-semibold text-slate-700">Acordos</th>
                                            <th className="text-right py-3 px-4 font-semibold text-slate-700">% Acordos</th>
                                            <th className="text-right py-3 px-4 font-semibold text-slate-700">Valor Cobrado</th>
                                            <th className="text-right py-3 px-4 font-semibold text-slate-700">Valor Recuperado</th>
                                            <th className="text-right py-3 px-4 font-semibold text-slate-700">% Recuperado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dados.periodos.map((periodo, periodoIdx) => {
                                            const cores = ['bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50', 'bg-pink-50'];
                                            const coresTexto = ['text-blue-800', 'text-green-800', 'text-yellow-800', 'text-purple-800', 'text-pink-800'];
                                            const cor = cores[periodoIdx % cores.length];
                                            const corTexto = coresTexto[periodoIdx % coresTexto.length];
                                            
                                            return (
                                                <Fragment key={`periodo-${periodoIdx}`}>
                                                    <tr className={cor}>
                                                        <td colSpan="7" className={`py-2 px-4 font-semibold ${corTexto}`}>
                                                            {periodo.nome}
                                                        </td>
                                                    </tr>
                                                    {periodo.dados.map((item, idx) => (
                                                        <tr key={`p${periodoIdx}-${idx}`} className="border-b border-slate-100">
                                                            <td className="py-2 px-4 text-slate-700">{item.date}</td>
                                                            <td className="py-2 px-4 text-right">{item.clientes_unicos_cobrados.toLocaleString('pt-BR')}</td>
                                                            <td className="py-2 px-4 text-right">{item.numero_acordos.toLocaleString('pt-BR')}</td>
                                                            <td className="py-2 px-4 text-right">{item.percent_acordos.toFixed(2)}%</td>
                                                            <td className="py-2 px-4 text-right">R$ {item.valor_total_cobrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                            <td className="py-2 px-4 text-right">R$ {item.valor_total_recuperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                            <td className="py-2 px-4 text-right">{item.percent_valor_recuperado.toFixed(2)}%</td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default Comparativo;

