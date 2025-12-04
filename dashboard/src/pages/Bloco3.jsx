import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import DateFilter from '../components/DateFilter';
import Loading from '../components/Loading';
import ClientesVirgensChart from '../components/ClientesVirgensChart';

const Card = React.memo(({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
));

const ChartContainer = React.memo(({ title, data, compareData = null }) => {
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
            <div style={{ width: '100%', height: '384px', minHeight: '384px' }}>
                {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={384}>
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
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-slate-500">Carregando gráfico...</div>
                    </div>
                )}
            </div>
        </Card>
    )
});

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

    // Memoizar fetchBlocoData para evitar recriações
    const fetchBlocoData = useCallback(async (startDate, endDate, groupBy = 'month') => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (groupBy) params.append('groupBy', groupBy);
            // Adicionar timestamp para evitar cache do navegador
            params.append('_t', Date.now().toString());
            
            // Usar rota específica do bloco 3 (otimizada)
            const url = `${API_ENDPOINTS.blocoData(3)}${params.toString() ? '?' + params.toString() : ''}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-cache', // Evitar cache do navegador
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
    }, []);

    // Memoizar os parâmetros de filtro para evitar recriações
    const filterKey = useMemo(() => {
        return JSON.stringify({
            startDate: filters.startDate,
            endDate: filters.endDate,
            compareMode: filters.compareMode,
            compareStartDate: filters.compareStartDate,
            compareEndDate: filters.compareEndDate,
            groupBy: filters.groupBy
        });
    }, [filters.startDate, filters.endDate, filters.compareMode, filters.compareStartDate, filters.compareEndDate, filters.groupBy]);

    useEffect(() => {
        let cancelled = false; // Flag para cancelar requisições
        
        const loadData = async () => {
            // Se estiver no modo diário sem datas selecionadas, não carregar dados
            if (filters.groupBy === 'day' && (!filters.startDate || !filters.endDate)) {
                if (!cancelled) {
                    setDashboardData(null);
                    setCompareData(null);
                    setLoading(false);
                }
                return;
            }
            
            // Limpar dados antigos antes de carregar novos para evitar mostrar dados em cache
            if (!cancelled) {
                setDashboardData(null);
                setCompareData(null);
            }
            
            setLoading(true);
            setError(null);
            try {
                const mainData = await fetchBlocoData(filters.startDate, filters.endDate, filters.groupBy);
                
                // Só atualizar se a requisição não foi cancelada
                if (!cancelled) {
                    setDashboardData({ bloco3: mainData });

                    if (filters.compareMode && filters.compareStartDate && filters.compareEndDate) {
                        const compareDataResult = await fetchBlocoData(filters.compareStartDate, filters.compareEndDate, filters.groupBy);
                        
                        // Só atualizar se a requisição não foi cancelada
                        if (!cancelled) {
                            setCompareData({ bloco3: compareDataResult });
                        }
                    } else {
                        setCompareData(null);
                    }
                }
            } catch (err) {
                // Só atualizar erro se a requisição não foi cancelada
                if (!cancelled) {
                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadData();
        
        // Cleanup: cancelar requisição se o componente for desmontado ou filtro mudar
        return () => {
            cancelled = true;
        };
    }, [filterKey, fetchBlocoData]); // Usar filterKey memoizado em vez de valores individuais

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

    // Se estiver no modo diário sem mês selecionado, mostrar mensagem
    if (filters.groupBy === 'day' && (!filters.startDate || !filters.endDate)) {
        return (
            <div className="space-y-6 px-4">
                <DateFilter 
                    onFilterChange={setFilters}
                    initialStartDate={filters.startDate}
                    initialEndDate={filters.endDate}
                    initialViewMode={filters.groupBy === 'day' ? 'day' : 'month'}
                />
                <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-center">
                        <p className="text-lg font-medium mb-2">Selecione um mês para visualizar os dados diários</p>
                        <p className="text-sm">Escolha um mês no filtro acima para ver os dados agrupados por dia</p>
                    </div>
                </div>
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
            <DateFilter 
                onFilterChange={setFilters}
                initialStartDate={filters.startDate}
                initialEndDate={filters.endDate}
                initialViewMode={filters.groupBy === 'day' ? 'day' : 'month'}
            />

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

            {/* Clientes Virgens, Pagamentos e Acordos */}
            <section>
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Clientes Virgens, Pagamentos e Acordos</h2>
                    <p className="text-slate-500">Evolução mensal de clientes virgens, total de pagamentos e acordos no Bloco 3 (181 a 360 dias de atraso)</p>
                </div>
                <ClientesVirgensChart bloco={3} />
            </section>
        </div>
    );
};

export default Bloco3;

