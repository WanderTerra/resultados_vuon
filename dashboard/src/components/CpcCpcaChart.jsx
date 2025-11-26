import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { aloService } from '../services/aloService';

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

    if (loading) {
        return (
            <Card title="Evolução CPC e CPCA ao Longo do Tempo" className="h-96">
                <div className="flex items-center justify-center h-full">
                    <div className="text-slate-500">Carregando dados...</div>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card title="Evolução CPC e CPCA ao Longo do Tempo" className="h-96">
                <div className="flex items-center justify-center h-full">
                    <div className="text-red-500">Erro: {error}</div>
                </div>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card title="Evolução CPC e CPCA ao Longo do Tempo" className="h-96">
                <div className="flex items-center justify-center h-full">
                    <div className="text-slate-500">Nenhum dado disponível</div>
                </div>
            </Card>
        );
    }

    // Formatar dados para o gráfico
    const chartData = data.map(item => ({
        date: new Date(item.data).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit' 
        }),
        cpc: item.cpc || 0,
        cpca: item.cpca || 0,
    }));

    return (
        <Card title="Evolução CPC e CPCA ao Longo do Tempo" className="h-96">
            <div style={{ width: '100%', height: '100%', minHeight: '384px', padding: '0' }}>
                <ResponsiveContainer width="100%" height="100%">
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
                        formatter={(value) => value.toLocaleString('pt-BR')}
                    />
                    <Legend />
                    <Line 
                        type="monotone" 
                        dataKey="cpc" 
                        name="CPC" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="cpca" 
                        name="CPCA" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default CpcCpcaChart;

