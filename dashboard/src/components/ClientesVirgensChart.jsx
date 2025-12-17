import React, { useEffect, useMemo, useState } from 'react';
import { clientesVirgensService } from '../services/clientesVirgensService';
import { ComposedChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Loading from './Loading';
import { getLast3Months } from '../utils/dateUtils';
import { API_ENDPOINTS } from '../config/api';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const monthKeyToInt = (yyyyMm) => {
    if (!yyyyMm) return null;
    const [y, m] = yyyyMm.split('-').map(Number);
    if (!y || !m) return null;
    return y * 12 + m; // monotônico por mês
};

const inMonthRange = (mesYYYYMM01, startDate, endDate) => {
    if (!mesYYYYMM01 || !startDate || !endDate) return true;
    const mesKey = monthKeyToInt(mesYYYYMM01.slice(0, 7));
    const startKey = monthKeyToInt(startDate.slice(0, 7));
    const endKey = monthKeyToInt(endDate.slice(0, 7));
    if (mesKey === null || startKey === null || endKey === null) return true;
    return mesKey >= startKey && mesKey <= endKey;
};

const mmYyyyToMesYYYYMM01 = (mmYyyy) => {
    if (!mmYyyy || !mmYyyy.includes('/')) return null;
    const [mm, yyyy] = mmYyyy.split('/');
    if (!mm || !yyyy) return null;
    return `${yyyy}-${String(mm).padStart(2, '0')}-01`;
};

const toPercent = (numerator, denominator) => {
    const n = Number(numerator || 0);
    const d = Number(denominator || 0);
    if (!d) return 0;
    return Number(((n * 100) / d).toFixed(2));
};

// Gráfico de linhas: mostra Clientes únicos x Acordos (mesma base do gráfico "Acordos x Pagamentos").
// - Quando `showAllBlocos` = true: mostra Bloco 1/2/3/WO no mesmo gráfico (todas as faixas de atraso).
// - Quando `bloco` é definido: mostra apenas aquela faixa.
// - `startDate`/`endDate`: quando fornecidos pelo DateFilter da página, são aplicados aqui também.
const ClientesVirgensChart = ({ bloco = null, startDate = null, endDate = null, showAllBlocos = false }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const effectiveDates = useMemo(() => {
        if (startDate && endDate) {
            return { startDate, endDate };
        }
        return getLast3Months();
    }, [startDate, endDate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const { startDate: effStart, endDate: effEnd } = effectiveDates;

                // Caso "todas as faixas": buscar por bloco e combinar por mês
                if (showAllBlocos) {
                    const [b1, b2, b3, bwo] = await Promise.all([
                        clientesVirgensService.getClientesVirgens(1, effStart, effEnd),
                        clientesVirgensService.getClientesVirgens(2, effStart, effEnd),
                        clientesVirgensService.getClientesVirgens(3, effStart, effEnd),
                        clientesVirgensService.getClientesVirgens('wo', effStart, effEnd),
                    ]);

                    const monthMap = new Map();
                    const upsert = (rows, key) => {
                        (rows?.data || []).forEach(item => {
                            const mes = item.mes;
                            if (!mes) return;
                            const formattedDate = item.date_formatted
                                || (mes ? `${mes.slice(5, 7)}/${mes.slice(0, 4)}` : '');

                            const existing = monthMap.get(mes) || { mes, date: formattedDate };
                            monthMap.set(mes, {
                                ...existing,
                                date: existing.date || formattedDate,
                                [key]: item.qtd_clientes_virgens || 0
                            });
                        });
                    };

                    upsert(b1, 'bloco1');
                    upsert(b2, 'bloco2');
                    upsert(b3, 'bloco3');
                    upsert(bwo, 'blocoWO');

                    const combined = Array.from(monthMap.values())
                        .map(r => ({
                            ...r,
                            bloco1: r.bloco1 || 0,
                            bloco2: r.bloco2 || 0,
                            bloco3: r.bloco3 || 0,
                            blocoWO: r.blocoWO || 0,
                        }))
                        // Garantir que só entram meses dentro do range selecionado (evita “meses extras”)
                        .filter(r => inMonthRange(r.mes, effStart, effEnd))
                        .sort((a, b) => (a.mes || '').localeCompare(b.mes || ''));

                    setData(combined);
                    return;
                }

                // Caso "uma faixa" (bloco específico ou agregado geral)
                const [clientesResult, blocoResult] = await Promise.all([
                    clientesVirgensService.getClientesVirgens(bloco, effStart, effEnd),
                    // Acordos: puxar do MESMO endpoint do gráfico "Acordos x Pagamentos"
                    (async () => {
                        if (!bloco) return null;
                        const token = localStorage.getItem('token');
                        const params = new URLSearchParams();
                        if (effStart) params.append('startDate', effStart);
                        if (effEnd) params.append('endDate', effEnd);
                        params.append('groupBy', 'month');
                        params.append('_t', Date.now().toString());
                        const url = `${API_ENDPOINTS.blocoData(bloco)}?${params.toString()}`;
                        const resp = await fetch(url, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                            cache: 'no-cache',
                        });
                        if (!resp.ok) return null;
                        return await resp.json();
                    })()
                ]);

                // Map de clientes únicos por mês (MM/YYYY)
                const clientesMap = new Map();
                (clientesResult.data || [])
                    .filter(item => inMonthRange(item.mes, effStart, effEnd))
                    .forEach(item => {
                        const key = item.date_formatted
                            || (item.mes ? `${item.mes.slice(5, 7)}/${item.mes.slice(0, 4)}` : null);
                        if (!key) return;
                        clientesMap.set(key, Number(item.qtd_clientes_virgens || 0));
                    });

                // Base do eixo X: usar exatamente a série do "Acordos x Pagamentos"
                const base = Array.isArray(blocoResult?.acordosXPagamentos)
                    ? blocoResult.acordosXPagamentos
                    : [];

                const chartData = base
                    .map(item => {
                        const mes = mmYyyyToMesYYYYMM01(item.date);
                        const clientes = clientesMap.get(item.date) || 0;
                        const acordos = Number(item.acordos || 0);
                        return {
                            mes,
                            date: item.date,
                            clientes_unicos: clientes,
                            acordos,
                            conversao: toPercent(acordos, clientes),
                        };
                    })
                    .filter(r => inMonthRange(r.mes, effStart, effEnd));

                // Fallback: se por algum motivo não veio base do bloco (ex.: bloco null), usar dados do clientes-virgens
                if (!chartData.length) {
                    const fallback = (clientesResult.data || [])
                        .filter(item => inMonthRange(item.mes, effStart, effEnd))
                        .map(item => {
                            const formattedDate = item.date_formatted
                                || (item.mes ? `${item.mes.slice(5, 7)}/${item.mes.slice(0, 4)}` : '');
                            const clientes = Number(item.qtd_clientes_virgens || 0);
                            const acordos = Number(item.total_acordos || 0);
                            return {
                                mes: item.mes,
                                date: formattedDate,
                                clientes_unicos: clientes,
                                acordos,
                                conversao: toPercent(acordos, clientes),
                            };
                        });
                    setData(fallback);
                } else {
                    setData(chartData);
                }
            } catch (err) {
                console.error('Error fetching clientes virgens data:', err);
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [bloco, effectiveDates, showAllBlocos]);

    if (loading) {
        const title = showAllBlocos
            ? 'Clientes únicos por faixa de atraso'
            : (bloco ? `Clientes únicos x Acordos (Conversão) - Bloco ${bloco}` : 'Clientes únicos x Acordos (Conversão)');
        return (
            <Card title={title}>
                <Loading message="Carregando dados..." />
            </Card>
        );
    }

    if (error) {
        const title = showAllBlocos
            ? 'Clientes únicos por faixa de atraso'
            : (bloco ? `Clientes únicos x Acordos (Conversão) - Bloco ${bloco}` : 'Clientes únicos x Acordos (Conversão)');
        return (
            <Card title={title}>
                <div className="flex items-center justify-center h-64">
                    <div className="text-red-500">Erro ao carregar dados: {error}</div>
                </div>
            </Card>
        );
    }

    const title = showAllBlocos
        ? 'Clientes únicos por faixa de atraso'
        : (bloco ? `Clientes únicos x Acordos (Conversão) - Bloco ${bloco}` : 'Clientes únicos x Acordos (Conversão)');

    return (
        <Card title={title} className="h-96">
            <div style={{ width: '100%', height: '384px', minHeight: '384px' }}>
                {data && data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={384}>
                        {showAllBlocos ? (
                            <LineChart
                                data={data}
                                margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
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
                                    axisLine={true}
                                    tickLine={true}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    stroke="#cbd5e1"
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value, name) => {
                                        const labelMap = {
                                            bloco1: 'Bloco 1 (61-90)',
                                            bloco2: 'Bloco 2 (91-180)',
                                            bloco3: 'Bloco 3 (181-360)',
                                            blocoWO: 'WO (360+)',
                                        };
                                        const label = labelMap[name] || name;
                                        return [Number(value || 0).toLocaleString('pt-BR'), label];
                                    }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="bloco1" name="Bloco 1 (61-90)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="bloco2" name="Bloco 2 (91-180)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="bloco3" name="Bloco 3 (181-360)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="blocoWO" name="WO (360+)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        ) : (
                            <ComposedChart
                                data={data}
                                margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
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
                                    domain={[0, (dataMax) => Math.min(100, Math.ceil((dataMax || 0) / 10) * 10 || 100)]}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value, name, props) => {
                                        const payload = props?.payload || {};
                                        if (name === 'conversao') {
                                            return [`${Number(value || 0).toLocaleString('pt-BR')}%`, 'Conversão (Acordos / Clientes únicos)'];
                                        }
                                        if (name === 'clientes_unicos') {
                                            return [Number(value || 0).toLocaleString('pt-BR'), 'Clientes únicos'];
                                        }
                                        // Não plota acordos (para não “sumir”), mas mostramos no tooltip
                                        if (name === 'acordos') {
                                            return [Number(value || 0).toLocaleString('pt-BR'), 'Acordos'];
                                        }
                                        // Incluir acordos no tooltip quando hover na barra/linha
                                        if (name === 'clientes_unicos' || name === 'conversao') {
                                            // noop
                                        }
                                        return [Number(value || 0).toLocaleString('pt-BR'), name];
                                    }}
                                    // Mostrar também acordos no tooltip mesmo não sendo série principal no hover
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload || !payload.length) return null;
                                        const p = payload[0]?.payload || {};
                                        return (
                                            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 10px' }}>
                                                <div style={{ fontWeight: 600, marginBottom: 6, color: '#0f172a' }}>{label}</div>
                                                <div style={{ color: '#334155' }}>Clientes únicos: {Number(p.clientes_unicos || 0).toLocaleString('pt-BR')}</div>
                                                <div style={{ color: '#334155' }}>Acordos: {Number(p.acordos || 0).toLocaleString('pt-BR')}</div>
                                                <div style={{ color: '#334155' }}>Conversão: {Number(p.conversao || 0).toLocaleString('pt-BR')}%</div>
                                            </div>
                                        );
                                    }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="clientes_unicos" name="Clientes únicos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                <Line yAxisId="right" type="monotone" dataKey="conversao" name="Conversão (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </ComposedChart>
                        )}
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

