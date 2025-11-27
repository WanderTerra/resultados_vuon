import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { aloService } from '../services/aloService';
import Loading from './Loading';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const AcoesChart = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAcoes, setSelectedAcoes] = useState(new Set()); // Ações selecionadas
    const [showFilter, setShowFilter] = useState(false); // Mostrar/ocultar filtro
    const [initialized, setInitialized] = useState(false); // Flag para controlar inicialização

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await aloService.getAcoes();
                setData(response.data);
            } catch (err) {
                console.error('Error fetching ações data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Inicializar seleção com todas as ações quando os dados carregam (apenas uma vez)
    useEffect(() => {
        if (data && data.length > 0 && !initialized) {
            const allAcoes = new Set(data.map(item => item.acao));
            setSelectedAcoes(allAcoes);
            setInitialized(true);
        }
    }, [data, initialized]);

    if (loading) {
        return (
            <Card title="Distribuição de Ações" className="h-96">
                <Loading message="Carregando distribuição de ações..." />
            </Card>
        );
    }

    if (error) {
        return (
            <Card title="Distribuição de Ações" className="h-96">
                <div className="flex items-center justify-center h-full">
                    <div className="text-red-500">Erro: {error}</div>
                </div>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card title="Distribuição de Ações" className="h-96">
                <div className="flex items-center justify-center h-full">
                    <div className="text-slate-500">Nenhum dado disponível</div>
                </div>
            </Card>
        );
    }

    // Formatar dados para o gráfico, filtrando pelas ações selecionadas
    const chartData = data
        .filter(item => selectedAcoes.has(item.acao))
        .map(item => ({
            acao: item.acao,
            total: item.total || 0,
            percentual: parseFloat(item.percentual) || 0,
        }))
        .sort((a, b) => b.total - a.total); // Ordenar por total descendente

    // Toggle de seleção de ação
    const toggleAcao = (acao) => {
        const newSelected = new Set(selectedAcoes);
        if (newSelected.has(acao)) {
            newSelected.delete(acao);
        } else {
            newSelected.add(acao);
        }
        setSelectedAcoes(newSelected);
    };

    // Selecionar todas as ações
    const selectAll = () => {
        if (data) {
            const allAcoes = new Set(data.map(item => item.acao));
            setSelectedAcoes(allAcoes);
        }
    };

    // Desmarcar todas as ações
    const deselectAll = () => {
        setSelectedAcoes(new Set());
    };

    return (
        <Card title="Distribuição de Ações" className="h-[500px]">
            {/* Filtro de Ações */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">Filtrar Ações:</span>
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        {showFilter ? 'Ocultar' : 'Mostrar'} Filtro
                    </button>
                </div>
                
                {showFilter && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-48 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                            <button
                                onClick={selectAll}
                                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                Selecionar Todas
                            </button>
                            <button
                                onClick={deselectAll}
                                className="text-xs px-3 py-1 bg-slate-400 text-white rounded hover:bg-slate-500 transition-colors"
                            >
                                Desmarcar Todas
                            </button>
                            <span className="text-xs text-slate-500 ml-auto">
                                {selectedAcoes.size} de {data?.length || 0} selecionadas
                            </span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                            {data && data.map(item => (
                                <label
                                    key={item.acao}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedAcoes.has(item.acao)}
                                        onChange={() => toggleAcao(item.acao)}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">
                                        {item.acao}
                                        <span className="text-xs text-slate-500 ml-1">
                                            ({item.total?.toLocaleString('pt-BR') || 0})
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-500">Nenhuma ação selecionada</div>
                </div>
            ) : (
            <div className="w-full" style={{ height: '384px', minHeight: '384px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height={384}>
                    <BarChart
                    data={chartData}
                    margin={{
                        top: 10,
                        right: 10,
                        left: 10,
                        bottom: 40,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="acao" 
                        axisLine={true} 
                        tickLine={true} 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        stroke="#cbd5e1"
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
                            if (name === 'total') {
                                return [value.toLocaleString('pt-BR'), 'Total'];
                            }
                            if (name === 'percentual') {
                                return [`${value.toFixed(2)}%`, 'Percentual'];
                            }
                            return value;
                        }}
                    />
                    <Legend />
                    <Bar 
                        dataKey="total" 
                        name="Total" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                    />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            )}
        </Card>
    );
};

export default AcoesChart;

