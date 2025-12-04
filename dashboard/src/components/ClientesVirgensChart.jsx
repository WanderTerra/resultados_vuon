import React, { useEffect, useState } from 'react';
import { clientesVirgensService } from '../services/clientesVirgensService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Loading from './Loading';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const ClientesVirgensChart = ({ bloco = null }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const result = await clientesVirgensService.getClientesVirgens(bloco);
                
                // Processar dados para o gráfico
                const chartData = result.data.map(item => {
                    // Converter mes (YYYY-MM-01) para formato mm/aaaa
                    const [year, month] = item.mes.split('-');
                    const formattedDate = `${month}/${year}`;
                    
                    return {
                        mes: item.mes,
                        date: formattedDate,
                        qtd_clientes_virgens: item.qtd_clientes_virgens || 0,
                        total_pagamentos: item.total_pagamentos || 0,
                        total_acordos: item.total_acordos || 0
                    };
                });
                
                setData(chartData);
            } catch (err) {
                console.error('Error fetching clientes virgens data:', err);
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [bloco]);

    if (loading) {
        const title = bloco ? `Clientes Virgens, Pagamentos e Acordos - Bloco ${bloco}` : 'Clientes Virgens, Pagamentos e Acordos';
        return (
            <Card title={title}>
                <Loading message="Carregando dados..." />
            </Card>
        );
    }

    if (error) {
        const title = bloco ? `Clientes Virgens, Pagamentos e Acordos - Bloco ${bloco}` : 'Clientes Virgens, Pagamentos e Acordos';
        return (
            <Card title={title}>
                <div className="flex items-center justify-center h-64">
                    <div className="text-red-500">Erro ao carregar dados: {error}</div>
                </div>
            </Card>
        );
    }

    // Identificar mês atual
    const now = new Date();
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const currentMonthFull = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Formatar dados com destaque para mês atual
    const formattedData = data.map(item => ({
        ...item,
        isCurrentMonth: item.mes === currentMonthFull
    }));

    const title = bloco ? `Clientes Virgens, Pagamentos e Acordos - Bloco ${bloco}` : 'Clientes Virgens, Pagamentos e Acordos';

    return (
        <Card title={title} className="h-[400px]">
            <div className="w-full" style={{ height: '384px', minHeight: '384px', position: 'relative' }}>
                {data && data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={384}>
                        <LineChart
                            data={formattedData}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 10,
                                bottom: 70,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                axisLine={true}
                                tickLine={true}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                stroke="#cbd5e1"
                                height={60}
                                angle={-45}
                                textAnchor="end"
                            />
                            <YAxis
                                yAxisId="left"
                                axisLine={true}
                                tickLine={true}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                stroke="#cbd5e1"
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={true}
                                tickLine={true}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                stroke="#cbd5e1"
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value, name) => {
                                    if (name === 'qtd_clientes_virgens') {
                                        return [value.toLocaleString('pt-BR'), 'Clientes Virgens'];
                                    }
                                    if (name === 'total_pagamentos') {
                                        return [value.toLocaleString('pt-BR'), 'Total Pagamentos'];
                                    }
                                    if (name === 'total_acordos') {
                                        return [value.toLocaleString('pt-BR'), 'Total Acordos'];
                                    }
                                    return value;
                                }}
                            />
                            <Legend />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="qtd_clientes_virgens"
                                name="Clientes Virgens"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={(props) => {
                                    const { payload } = props;
                                    // Destacar mês atual com marcador maior e cor diferente
                                    if (payload.isCurrentMonth) {
                                        return <circle cx={props.cx} cy={props.cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                                    }
                                    return <circle cx={props.cx} cy={props.cy} r={4} fill="#3b82f6" />;
                                }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="total_pagamentos"
                                name="Total Pagamentos"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={(props) => {
                                    const { payload } = props;
                                    // Destacar mês atual com marcador maior e cor diferente
                                    if (payload.isCurrentMonth) {
                                        return <circle cx={props.cx} cy={props.cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                                    }
                                    return <circle cx={props.cx} cy={props.cy} r={4} fill="#10b981" />;
                                }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="total_acordos"
                                name="Total Acordos"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={(props) => {
                                    const { payload } = props;
                                    // Destacar mês atual com marcador maior e cor diferente
                                    if (payload.isCurrentMonth) {
                                        return <circle cx={props.cx} cy={props.cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                                    }
                                    return <circle cx={props.cx} cy={props.cy} r={4} fill="#f59e0b" />;
                                }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-slate-500">Nenhum dado disponível</div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ClientesVirgensChart;

