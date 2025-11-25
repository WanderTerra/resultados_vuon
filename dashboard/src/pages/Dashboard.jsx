import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const ChartContainer = ({ title, data }) => {
    return (
        <Card title={title} className="h-96">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} unit="%" />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    {/* Dynamic bars based on keys would be better, but hardcoding for now based on specific chart types */}
                    {data[0]?.carteira !== undefined && <Bar yAxisId="left" dataKey="carteira" name="Carteira" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />}
                    {data[0]?.acionados !== undefined && <Bar yAxisId="left" dataKey="acionados" name="Acionados" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} />}
                    {data[0]?.alo !== undefined && <Bar yAxisId="left" dataKey="alo" name="Alô" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} />}
                    {data[0]?.cpc !== undefined && <Bar yAxisId="left" dataKey="cpc" name="CPC" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} />}
                    {data[0]?.cpca !== undefined && <Bar yAxisId="left" dataKey="cpca" name="CPCA" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />}
                    {data[0]?.acordos !== undefined && <Bar yAxisId="left" dataKey="acordos" name="Acordos" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} />}
                    {data[0]?.pgto !== undefined && <Bar yAxisId="left" dataKey="pgto" name="Pagamentos" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} />}

                    {/* Line for percentage */}
                    {data[0]?.percent !== undefined && (
                        <Line yAxisId="right" type="monotone" dataKey="percent" name="% Acionado" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </Card>
    )
}

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(API_ENDPOINTS.dashboardData, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch dashboard data');
                }

                const data = await response.json();
                setDashboardData(data);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Carregando dados...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Erro ao carregar dados: {error}</div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Nenhum dado disponível</div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <p className="text-blue-100 text-sm font-medium mb-1">Total de Spins</p>
                    <h3 className="text-3xl font-bold">{dashboardData.totalSpins?.toLocaleString() || 0}</h3>
                    {dashboardData.spinsVariation && (
                        <div className="mt-4 flex items-center text-blue-100 text-sm">
                            <span>{dashboardData.spinsVariation > 0 ? '+' : ''}{dashboardData.spinsVariation}% vs mês anterior</span>
                        </div>
                    )}
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-slate-500 text-sm font-medium mb-1">Recuperação Total</p>
                    <h3 className="text-3xl font-bold text-slate-800">R$ {dashboardData.financial.total.toLocaleString()}</h3>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-slate-500 text-sm font-medium mb-1">Eficiência Global</p>
                    <h3 className="text-3xl font-bold text-slate-800">{dashboardData.eficienciaGlobal?.toFixed(1) || 0}%</h3>
                </div>
            </div>

            {/* Bloco 1 */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Bloco 1</h2>
                        <p className="text-slate-500">Performance de Acionamento</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {dashboardData.bloco1.spins} Spins
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartContainer title="Acionados x Carteira" data={dashboardData.bloco1.acionadosXCarteira} />
                    <ChartContainer title="Acionados x Alô" data={dashboardData.bloco1.acionadosXAlo} />
                    <ChartContainer title="Alô x CPC" data={dashboardData.bloco1.aloXCpc} />
                    <ChartContainer title="CPC x CPCA" data={dashboardData.bloco1.cpcXCpca} />
                    <ChartContainer title="CPCA x Acordos" data={dashboardData.bloco1.cpcaXAcordos} />
                    <ChartContainer title="Acordos x Pagamentos" data={dashboardData.bloco1.acordosXPagamentos} />
                </div>
            </section>

            {/* Bloco 2 */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Bloco 2</h2>
                        <p className="text-slate-500">Performance de Acionamento</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {dashboardData.bloco2.spins} Spins
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartContainer title="Acionados x Carteira" data={dashboardData.bloco2.acionadosXCarteira} />
                    <ChartContainer title="Acionados x Alô" data={dashboardData.bloco2.acionadosXAlo} />
                    <ChartContainer title="Alô x CPC" data={dashboardData.bloco2.aloXCpc} />
                    <ChartContainer title="CPC x CPCA" data={dashboardData.bloco2.cpcXCpca} />
                    <ChartContainer title="CPCA x Acordos" data={dashboardData.bloco2.cpcaXAcordos} />
                    <ChartContainer title="Acordos x Pagamentos" data={dashboardData.bloco2.acordosXPagamentos} />
                </div>
            </section>

            {/* Bloco 3 */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Bloco 3</h2>
                        <p className="text-slate-500">Performance de Acionamento</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {dashboardData.bloco3.spins} Spins
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartContainer title="Acionados x Carteira" data={dashboardData.bloco3.acionadosXCarteira} />
                    <ChartContainer title="Acionados x Alô" data={dashboardData.bloco3.acionadosXAlo} />
                    <ChartContainer title="Alô x CPC" data={dashboardData.bloco3.aloXCpc} />
                    <ChartContainer title="CPC x CPCA" data={dashboardData.bloco3.cpcXCpca} />
                    <ChartContainer title="CPCA x Acordos" data={dashboardData.bloco3.cpcaXAcordos} />
                    <ChartContainer title="Acordos x Pagamentos" data={dashboardData.bloco3.acordosXPagamentos} />
                </div>
            </section>

            {/* Financials */}
            <section>
                <h2 className="text-xl font-bold text-slate-800 mb-6">Recebimento por Bloco</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Distribuição de Recebimento" className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardData.financial.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                                    {
                                        dashboardData.financial.chartData.map((entry, index) => (
                                            <cell key={`cell-${index}`} fill={entry.fill} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
