import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { aloService } from '../services/aloService';
import Loading from './Loading';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const CpcCpcaChart = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('area'); // 'area' ou 'line'
    const [showAverage, setShowAverage] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await aloService.getCpcCpcaByDate();
                setData(response.data);
            } catch (err) {
                console.error('Error fetching CPC/CPCA data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Calcular métricas e formatar dados
    const { chartData, metrics } = useMemo(() => {
        if (!data || data.length === 0) {
            return { chartData: [], metrics: null };
        }

        const formatted = data.map(item => ({
            date: new Date(item.data).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit',
                year: 'numeric'
            }),
            dateFull: item.data,
            cpc: parseInt(item.cpc || 0),
            cpca: parseInt(item.cpca || 0),
        }));

        // Calcular métricas
        const cpcValues = formatted.map(d => d.cpc);
        const cpcaValues = formatted.map(d => d.cpca);
        
        const calculateStats = (values) => {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = Math.round(sum / values.length);
            const max = Math.max(...values);
            const min = Math.min(...values);
            return { avg, max, min, sum };
        };

        const cpcStats = calculateStats(cpcValues);
        const cpcaStats = calculateStats(cpcaValues);

        return {
            chartData: formatted,
            metrics: {
                cpc: cpcStats,
                cpca: cpcaStats
            }
        };
    }, [data]);

    // Calcular intervalo para eixo X (mostrar menos labels)
    const xAxisInterval = useMemo(() => {
        if (!chartData || chartData.length === 0) return 0;
        const total = chartData.length;
        // Mostrar aproximadamente 12 labels
        return Math.floor(total / 12);
    }, [chartData]);

    if (loading) {
        return (
            <Card title="Evolução CPC e CPCA ao Longo do Tempo" className="h-[500px]">
                <Loading message="Carregando dados de CPC e CPCA..." />
            </Card>
        );
    }

    if (error) {
        return (
            <Card title="Evolução CPC e CPCA ao Longo do Tempo" className="h-[500px]">
                <div className="flex items-center justify-center h-full">
                    <div className="text-red-500">Erro: {error}</div>
                </div>
            </Card>
        );
    }

    if (!chartData || chartData.length === 0) {
        return (
            <Card title="Evolução CPC e CPCA ao Longo do Tempo" className="h-[500px]">
                <div className="flex items-center justify-center h-full">
                    <div className="text-slate-500">Nenhum dado disponível</div>
                </div>
            </Card>
        );
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
                    <p className="font-semibold text-slate-800 mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            <span className="font-medium">{entry.name}:</span>{' '}
                            <span className="font-bold">{entry.value.toLocaleString('pt-BR')}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Card title="Evolução CPC e CPCA ao Longo do Tempo" className="h-[500px]">
            {/* Métricas Resumidas */}
            {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium mb-1">CPC - Média</p>
                        <p className="text-lg font-bold text-blue-700">{metrics.cpc.avg.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                        <p className="text-xs text-orange-600 font-medium mb-1">CPCA - Média</p>
                        <p className="text-lg font-bold text-orange-700">{metrics.cpca.avg.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium mb-1">CPC - Máximo</p>
                        <p className="text-lg font-bold text-blue-700">{metrics.cpc.max.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                        <p className="text-xs text-orange-600 font-medium mb-1">CPCA - Máximo</p>
                        <p className="text-lg font-bold text-orange-700">{metrics.cpca.max.toLocaleString('pt-BR')}</p>
                    </div>
                </div>
            )}

            {/* Controles */}
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Visualização:</span>
                    <button
                        onClick={() => setViewMode('area')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            viewMode === 'area'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Área
                    </button>
                    <button
                        onClick={() => setViewMode('line')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            viewMode === 'line'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Linha
                    </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showAverage}
                        onChange={(e) => setShowAverage(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">Mostrar Médias</span>
                </label>
            </div>

            <div style={{ width: '100%', height: '384px', minHeight: '384px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height={384}>
                    {viewMode === 'area' ? (
                        <AreaChart
                            data={chartData}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 10,
                                bottom: 40,
                            }}
                        >
                            <defs>
                                <linearGradient id="colorCpc" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCpca" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={true} 
                                tickLine={true} 
                                tick={{ fill: '#64748b', fontSize: 11 }} 
                                stroke="#cbd5e1"
                                height={60}
                                angle={-45}
                                textAnchor="end"
                                interval={xAxisInterval}
                            />
                            <YAxis 
                                axisLine={true} 
                                tickLine={true} 
                                tick={{ fill: '#64748b', fontSize: 12 }} 
                                stroke="#cbd5e1"
                                tickFormatter={(value) => {
                                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                    return value.toString();
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {showAverage && metrics && (
                                <>
                                    <ReferenceLine 
                                        y={metrics.cpc.avg} 
                                        stroke="#3b82f6" 
                                        strokeDasharray="5 5" 
                                        label={{ value: `CPC Média: ${metrics.cpc.avg.toLocaleString('pt-BR')}`, position: "topRight", fill: '#3b82f6', fontSize: 11 }}
                                    />
                                    <ReferenceLine 
                                        y={metrics.cpca.avg} 
                                        stroke="#f59e0b" 
                                        strokeDasharray="5 5" 
                                        label={{ value: `CPCA Média: ${metrics.cpca.avg.toLocaleString('pt-BR')}`, position: "topRight", fill: '#f59e0b', fontSize: 11 }}
                                    />
                                </>
                            )}
                            <Area 
                                type="monotone" 
                                dataKey="cpc" 
                                name="CPC" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fill="url(#colorCpc)"
                                dot={{ r: 2 }}
                                activeDot={{ r: 5 }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="cpca" 
                                name="CPCA" 
                                stroke="#f59e0b" 
                                strokeWidth={2}
                                fill="url(#colorCpca)"
                                dot={{ r: 2 }}
                                activeDot={{ r: 5 }}
                            />
                        </AreaChart>
                    ) : (
                        <LineChart
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
                                dataKey="date" 
                                axisLine={true} 
                                tickLine={true} 
                                tick={{ fill: '#64748b', fontSize: 11 }} 
                                stroke="#cbd5e1"
                                height={60}
                                angle={-45}
                                textAnchor="end"
                                interval={xAxisInterval}
                            />
                            <YAxis 
                                axisLine={true} 
                                tickLine={true} 
                                tick={{ fill: '#64748b', fontSize: 12 }} 
                                stroke="#cbd5e1"
                                tickFormatter={(value) => {
                                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                    return value.toString();
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {showAverage && metrics && (
                                <>
                                    <ReferenceLine 
                                        y={metrics.cpc.avg} 
                                        stroke="#3b82f6" 
                                        strokeDasharray="5 5" 
                                        label={{ value: `CPC Média: ${metrics.cpc.avg.toLocaleString('pt-BR')}`, position: "topRight", fill: '#3b82f6', fontSize: 11 }}
                                    />
                                    <ReferenceLine 
                                        y={metrics.cpca.avg} 
                                        stroke="#f59e0b" 
                                        strokeDasharray="5 5" 
                                        label={{ value: `CPCA Média: ${metrics.cpca.avg.toLocaleString('pt-BR')}`, position: "topRight", fill: '#f59e0b', fontSize: 11 }}
                                    />
                                </>
                            )}
                            <Line 
                                type="monotone" 
                                dataKey="cpc" 
                                name="CPC" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                dot={{ r: 3 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="cpca" 
                                name="CPCA" 
                                stroke="#f59e0b" 
                                strokeWidth={3}
                                dot={{ r: 3 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default CpcCpcaChart;

