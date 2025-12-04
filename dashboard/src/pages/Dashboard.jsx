import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Metrics from '../components/Metrics';
import CpcCpcaChart from '../components/CpcCpcaChart';
import AcoesChart from '../components/AcoesChart';
import RecebimentoChart from '../components/RecebimentoChart';
import DiarioBordoChart from '../components/DiarioBordoChart';
import PeriodFilter from '../components/PeriodFilter';

const Dashboard = () => {
    const [aloFilterDates, setAloFilterDates] = useState(null); // { start, end } ou null para todos
    const [filterInitialized, setFilterInitialized] = useState(false); // Flag para saber se o filtro foi inicializado

    const handlePeriodChange = (dates) => {
        // Atualizar filtro e marcar como inicializado
        setAloFilterDates(dates);
        if (!filterInitialized) {
            setFilterInitialized(true);
        }
    };

    return (
        <div className="space-y-6 px-4">
            {/* Cards de Navegação para Blocos */}
            <section>
                <h2 className="text-xl font-bold text-slate-800 mb-6">Análise por Blocos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        to="/bloco1"
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow group min-h-40"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">Bloco 1</h3>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <span className="text-blue-600 font-bold">1</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">61 a 90 dias de atraso</p>
                        <p className="text-xs text-slate-400">Visualizar gráficos detalhados →</p>
                    </Link>

                    <Link
                        to="/bloco2"
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow group min-h-40"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">Bloco 2</h3>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <span className="text-blue-600 font-bold">2</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">91 a 180 dias de atraso</p>
                        <p className="text-xs text-slate-400">Visualizar gráficos detalhados →</p>
                    </Link>

                    <Link
                        to="/bloco3"
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow group min-h-40"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">Bloco 3</h3>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <span className="text-blue-600 font-bold">3</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">181 a 360 dias de atraso</p>
                        <p className="text-xs text-slate-400">Visualizar gráficos detalhados →</p>
                    </Link>

                    <Link
                        to="/wo"
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow group min-h-40"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors">WO</h3>
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                                <span className="text-red-600 font-bold">WO</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">Mais de 360 dias de atraso</p>
                        <p className="text-xs text-slate-400">Visualizar gráficos detalhados →</p>
                    </Link>
                </div>
            </section>

            {/* Recebimento por Bloco */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Recebimento por Bloco</h2>
                        <p className="text-slate-500">Evolução do recebimento financeiro ao longo do tempo</p>
                    </div>
                </div>
                <RecebimentoChart />
            </section>

            {/* Diário de Bordo */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Diário de Bordo</h2>
                        <p className="text-slate-500">Monitoramento de acordos (DDA e ACD) por hora, separados por blocos</p>
                    </div>
                </div>
                <DiarioBordoChart />
            </section>

            {/* Análise ALO, CPC e CPCA */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Análise ALO, CPC e CPCA</h2>
                        <p className="text-slate-500">Métricas e gráficos de Agente Lógico Operacional</p>
                    </div>
                </div>

                {/* Filtro de Período */}
                <PeriodFilter onPeriodChange={handlePeriodChange} />

                {/* Métricas - só renderizar após filtro ser inicializado */}
                {filterInitialized && (
                    <div className="mb-8">
                        <Metrics startDate={aloFilterDates?.start} endDate={aloFilterDates?.end} />
                    </div>
                )}

                {/* Gráficos - só renderizar após filtro ser inicializado */}
                {filterInitialized && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <CpcCpcaChart startDate={aloFilterDates?.start} endDate={aloFilterDates?.end} />
                        <AcoesChart startDate={aloFilterDates?.start} endDate={aloFilterDates?.end} />
                    </div>
                )}
            </section>
        </div>
    );
};

export default Dashboard;
