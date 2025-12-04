import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Loading from './Loading';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const DiarioBordoChart = () => {
    const [data, setData] = useState(null);
    const [dataReferencia, setDataReferencia] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBlocos, setSelectedBlocos] = useState(new Set(['bloco1', 'bloco2', 'bloco3', 'blocowo']));
    const [dataSelecionada, setDataSelecionada] = useState(''); // Data selecionada pelo usuário
    const [dataAlterada, setDataAlterada] = useState(false); // Flag para indicar se a data foi alterada automaticamente
    const [inicializado, setInicializado] = useState(false); // Flag para controlar inicialização

    // Efeito para inicializar a data na primeira carga
    useEffect(() => {
        if (dataReferencia && !inicializado && !dataSelecionada) {
            setDataSelecionada(dataReferencia);
            setInicializado(true);
        }
    }, [dataReferencia, inicializado, dataSelecionada]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = localStorage.getItem('token');

                // Enviar parâmetro de data se selecionado, senão busca o dia mais recente
                const params = new URLSearchParams();
                if (dataSelecionada) {
                    params.append('data', dataSelecionada);
                }

                const url = `${API_ENDPOINTS.diarioBordo}${params.toString() ? '?' + params.toString() : ''}`;
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch diário de bordo data');
                }

                const result = await response.json();

                // Verificar se a data foi alterada automaticamente
                if (result.dataAlterada && result.dataReferencia) {
                    // Atualizar a data selecionada para a data que foi usada
                    setDataSelecionada(result.dataReferencia);
                    setDataAlterada(true);
                    console.log(`ℹ️  Data alterada automaticamente de ${result.dataOriginal} para ${result.dataReferencia}`);

                    // Limpar a flag após 5 segundos
                    setTimeout(() => setDataAlterada(false), 5000);
                } else {
                    setDataAlterada(false);
                }

                // Salvar data de referência
                if (result.dataReferencia) {
                    setDataReferencia(result.dataReferencia);
                }

                if (result.data && result.data.length > 0) {
                    // Criar um mapa com todas as horas (0-23) preenchidas
                    const horasCompletas = new Map();

                    // Inicializar todas as horas com zeros
                    for (let h = 0; h < 24; h++) {
                        horasCompletas.set(h, {
                            hora: h,
                            horaFormatada: `${String(h).padStart(2, '0')}:00`,
                            bloco1: 0,
                            bloco2: 0,
                            bloco3: 0,
                            blocowo: 0
                        });
                    }

                    // Preencher com dados reais
                    result.data.forEach(item => {
                        const hora = item.hora;
                        if (horasCompletas.has(hora)) {
                            const entry = horasCompletas.get(hora);
                            // Adicionar dados de cada bloco
                            if (item.blocos) {
                                Object.keys(item.blocos).forEach(blocoKey => {
                                    const blocoData = item.blocos[blocoKey];
                                    entry[blocoKey] = blocoData.total || 0;
                                });
                            }
                        }
                    });

                    // Converter para array e ordenar
                    const chartData = Array.from(horasCompletas.values())
                        .sort((a, b) => a.hora - b.hora);

                    setData(chartData);
                } else {
                    setData([]);
                }
            } catch (err) {
                console.error('Error fetching diário de bordo data:', err);
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dataSelecionada]);

    const toggleBloco = (bloco) => {
        const newSelected = new Set(selectedBlocos);
        if (newSelected.has(bloco)) {
            newSelected.delete(bloco);
        } else {
            newSelected.add(bloco);
        }
        setSelectedBlocos(newSelected);
    };

    const selectAll = () => {
        setSelectedBlocos(new Set(['bloco1', 'bloco2', 'bloco3', 'blocowo']));
    };

    const deselectAll = () => {
        setSelectedBlocos(new Set());
    };

    if (loading) {
        return (
            <Card title="Diário de Bordo - Acordos por Hora">
                <Loading message="Carregando dados do diário de bordo..." />
            </Card>
        );
    }

    if (error) {
        return (
            <Card title="Diário de Bordo - Acordos por Hora">
                <div className="flex items-center justify-center h-64">
                    <div className="text-red-500">Erro ao carregar dados: {error}</div>
                </div>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card title="Diário de Bordo - Acordos por Hora">
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-500">Nenhum dado disponível</div>
                </div>
            </Card>
        );
    }

    // Filtrar dados apenas para blocos selecionados
    const filteredData = data.map(item => {
        const filtered = { ...item };
        ['bloco1', 'bloco2', 'bloco3', 'blocowo'].forEach(bloco => {
            if (!selectedBlocos.has(bloco)) {
                delete filtered[bloco];
            }
        });
        return filtered;
    });

    const blocosConfig = [
        { key: 'bloco1', name: 'Bloco 1', color: '#f59e0b' },
        { key: 'bloco2', name: 'Bloco 2', color: '#64748b' },
        { key: 'bloco3', name: 'Bloco 3', color: '#3b82f6' },
        { key: 'blocowo', name: 'WO', color: '#1e293b' }
    ];

    // Formatar data de referência para exibição
    const formatarData = (dataStr) => {
        if (!dataStr) return '';
        try {
            const date = new Date(dataStr + 'T00:00:00');
            return date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dataStr;
        }
    };

    const tituloCompleto = dataReferencia
        ? `Diário de Bordo - Acordos por Hora (DDA e ACD) - ${formatarData(dataReferencia)}`
        : 'Diário de Bordo - Acordos por Hora (DDA e ACD)';

    return (
        <Card title={tituloCompleto} className="h-[500px]">
            {/* Filtro de Data */}
            <div className="mb-4">
                <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Filtrar por Data:</span>
                        <input
                            type="date"
                            value={dataSelecionada}
                            onChange={(e) => setDataSelecionada(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </label>
                    {dataSelecionada && (
                        <button
                            onClick={() => {
                                setDataSelecionada('');
                                setInicializado(false); // Resetar para permitir nova inicialização
                            }}
                            className="text-xs px-3 py-1 bg-slate-400 text-white rounded hover:bg-slate-500 transition-colors"
                        >
                            Usar Dia Mais Recente
                        </button>
                    )}
                </div>
                {dataAlterada && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-700">
                            ⚠️ A data selecionada não tinha dados. Mostrando dados de: <strong>{formatarData(dataReferencia)}</strong>
                        </p>
                    </div>
                )}
                {dataReferencia && !dataSelecionada && !dataAlterada && (
                    <p className="text-xs text-slate-500 italic">
                        Mostrando dados do dia mais recente disponível: {formatarData(dataReferencia)}
                    </p>
                )}
            </div>

            {/* Filtro de Blocos */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">Filtrar Blocos:</span>
                    <div className="flex gap-2">
                        <button
                            onClick={selectAll}
                            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Todos
                        </button>
                        <button
                            onClick={deselectAll}
                            className="text-xs px-3 py-1 bg-slate-400 text-white rounded hover:bg-slate-500 transition-colors"
                        >
                            Nenhum
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {blocosConfig.map(bloco => (
                        <label
                            key={bloco.key}
                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={selectedBlocos.has(bloco.key)}
                                onChange={() => toggleBloco(bloco.key)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <span
                                className="text-sm text-slate-700"
                                style={{ color: selectedBlocos.has(bloco.key) ? bloco.color : '#94a3b8' }}
                            >
                                {bloco.name}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="w-full" style={{ height: '384px', minHeight: '384px', position: 'relative' }}>
                {filteredData && filteredData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={384}>
                        <LineChart
                            data={filteredData}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 10,
                                bottom: 40,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="horaFormatada"
                                axisLine={true}
                                tickLine={true}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                stroke="#cbd5e1"
                                height={60}
                                angle={-45}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis
                                axisLine={true}
                                tickLine={true}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                stroke="#cbd5e1"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value, name) => {
                                    const blocoName = blocosConfig.find(b => b.key === name)?.name || name;
                                    return [value, blocoName];
                                }}
                            />
                            <Legend />
                            {blocosConfig.map(bloco => {
                                if (selectedBlocos.has(bloco.key)) {
                                    return (
                                        <Line
                                            key={bloco.key}
                                            type="monotone"
                                            dataKey={bloco.key}
                                            name={bloco.name}
                                            stroke={bloco.color}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    );
                                }
                                return null;
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-slate-500">Nenhum dado disponível para os blocos selecionados</div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default DiarioBordoChart;

