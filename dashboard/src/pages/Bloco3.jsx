import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import DateFilter from '../components/DateFilter';
import Loading from '../components/Loading';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const ChartContainer = ({ title, data, compareData = null }) => {
    if ((!data || !Array.isArray(data) || data.length === 0) && (!compareData || !Array.isArray(compareData) || compareData.length === 0)) {
        return (
            <Card title={title} className="h-96">
                <div className="flex items-center justify-center h-full">
                    <div className="text-slate-500">Nenhum dado disponível</div>
                </div>
            </Card>
        );
    }

    const combinedData = compareData && data ? 
        data.map((item, index) => {
            const compareItem = compareData[index] || {};
            return {
                date: item.date,
                ...item,
                ...Object.keys(compareItem).reduce((acc, key) => {
                    acc[`compare_${key}`] = compareItem[key];
                    return acc;
                }, {})
            };
        }) : (data || []);

    const chartData = combinedData.length > 0 ? combinedData : data || [];

    return (
        <Card title={title} className="h-96">
            <div style={{ width: '100%', height: '384px', minHeight: '384px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height={384} minHeight={384} minWidth={0}>
                    <ComposedChart
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
                        stroke="#cbd5e1"
                        height={60}
                    />
                    <YAxis 
                        yAxisId="left" 
                        orientation="left" 
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
                        unit="%" 
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    {chartData[0]?.carteira !== undefined && <Bar yAxisId="left" dataKey="carteira" name="Carteira" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={compareData ? 15 : 20} />}
                    {chartData[0]?.acionados !== undefined && <Bar yAxisId="left" dataKey="acionados" name="Acionados" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={compareData ? 15 : 20} />}
                    {chartData[0]?.alo !== undefined && <Bar yAxisId="left" dataKey="alo" name="Alô" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={compareData ? 15 : 20} />}
                    {chartData[0]?.cpc !== undefined && <Bar yAxisId="left" dataKey="cpc" name="CPC" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={compareData ? 15 : 20} />}
                    {chartData[0]?.cpca !== undefined && <Bar yAxisId="left" dataKey="cpca" name="CPCA" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={compareData ? 15 : 20} />}
                    {chartData[0]?.acordos !== undefined && <Bar yAxisId="left" dataKey="acordos" name="Acordos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={compareData ? 15 : 20} />}
                    {chartData[0]?.pgto !== undefined && <Bar yAxisId="left" dataKey="pgto" name="Pagamentos" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={compareData ? 15 : 20} />}
                    {compareData && chartData[0]?.compare_carteira !== undefined && <Bar yAxisId="left" dataKey="compare_carteira" name="Carteira (Comparação)" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={15} />}
                    {compareData && chartData[0]?.compare_acionados !== undefined && <Bar yAxisId="left" dataKey="compare_acionados" name="Acionados (Comparação)" fill="#64748b" radius={[4, 4, 0, 0]} barSize={15} />}
                    {compareData && chartData[0]?.compare_alo !== undefined && <Bar yAxisId="left" dataKey="compare_alo" name="Alô (Comparação)" fill="#64748b" radius={[4, 4, 0, 0]} barSize={15} />}
                    {compareData && chartData[0]?.compare_cpc !== undefined && <Bar yAxisId="left" dataKey="compare_cpc" name="CPC (Comparação)" fill="#64748b" radius={[4, 4, 0, 0]} barSize={15} />}
                    {compareData && chartData[0]?.compare_cpca !== undefined && <Bar yAxisId="left" dataKey="compare_cpca" name="CPCA (Comparação)" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={15} />}
                    {compareData && chartData[0]?.compare_acordos !== undefined && <Bar yAxisId="left" dataKey="compare_acordos" name="Acordos (Comparação)" fill="#6ee7b7" radius={[4, 4, 0, 0]} barSize={15} />}
                    {compareData && chartData[0]?.compare_pgto !== undefined && <Bar yAxisId="left" dataKey="compare_pgto" name="Pagamentos (Comparação)" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={15} />}
                    {chartData[0]?.percent !== undefined && (
                        <Line yAxisId="right" type="monotone" dataKey="percent" name="% Acionado" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} />
                    )}
                    {compareData && chartData[0]?.compare_percent !== undefined && (
                        <Line yAxisId="right" type="monotone" dataKey="compare_percent" name="% Acionado (Comparação)" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                    )}
                </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}

const Bloco3 = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [compareData, setCompareData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        compareMode: false,
        compareStartDate: null,
        compareEndDate: null,
        groupBy: 'month'
    });

    const fetchBlocoData = async (startDate, endDate, groupBy = 'month') => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (groupBy) params.append('groupBy', groupBy);
            
            // Usar rota específica do bloco 3 (otimizada)
            const url = `${API_ENDPOINTS.blocoData(3)}${params.toString() ? '?' + params.toString() : ''}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bloco data');
            }

            const data = await response.json();
            return {
                spins: data.spins || 0,
                acionadosXCarteira: data.acionadosXCarteira || [],
                acionadosXAlo: data.acionadosXAlo || [],
                aloXCpc: data.aloXCpc || [],
                cpcXCpca: data.cpcXCpca || [],
                cpcaXAcordos: data.cpcaXAcordos || [],
                acordosXPagamentos: data.acordosXPagamentos || []
            };
        } catch (err) {
            console.error('Error fetching bloco data:', err);
            throw err;
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const mainData = await fetchBlocoData(filters.startDate, filters.endDate, filters.groupBy);
                setDashboardData({ bloco3: mainData });

                if (filters.compareMode && filters.compareStartDate && filters.compareEndDate) {
                    const compareDataResult = await fetchBlocoData(filters.compareStartDate, filters.compareEndDate, filters.groupBy);
                    setCompareData({ bloco3: compareDataResult });
                } else {
                    setCompareData(null);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [filters.startDate, filters.endDate, filters.compareMode, filters.compareStartDate, filters.compareEndDate, filters.groupBy]);

    if (loading) {
        return <Loading message="Carregando dados do Bloco 3..." />;
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
        <div className="space-y-6 px-4">
            {/* Filtros de Data */}
            <DateFilter onFilterChange={setFilters} />

            {/* Bloco 3 */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Bloco 3</h2>
                        <p className="text-slate-500">181 a 360 dias de atraso</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {dashboardData?.bloco3?.spins || 0} Spins
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartContainer 
                        title="Acionados x Carteira" 
                        data={dashboardData?.bloco3?.acionadosXCarteira || []} 
                        compareData={compareData?.bloco3?.acionadosXCarteira}
                    />
                    <ChartContainer 
                        title="Acionados x Alô" 
                        data={dashboardData?.bloco3?.acionadosXAlo || []} 
                        compareData={compareData?.bloco3?.acionadosXAlo}
                    />
                    <ChartContainer 
                        title="Alô x CPC" 
                        data={dashboardData?.bloco3?.aloXCpc || []} 
                        compareData={compareData?.bloco3?.aloXCpc}
                    />
                    <ChartContainer 
                        title="CPC x CPCA" 
                        data={dashboardData?.bloco3?.cpcXCpca || []} 
                        compareData={compareData?.bloco3?.cpcXCpca}
                    />
                    <ChartContainer 
                        title="CPCA x Acordos" 
                        data={dashboardData?.bloco3?.cpcaXAcordos || []} 
                        compareData={compareData?.bloco3?.cpcaXAcordos}
                    />
                    <ChartContainer 
                        title="Acordos x Pagamentos" 
                        data={dashboardData?.bloco3?.acordosXPagamentos || []} 
                        compareData={compareData?.bloco3?.acordosXPagamentos}
                    />
                </div>
            </section>
        </div>
    );
};

export default Bloco3;

