import React, { useState } from 'react';
import ProdutividadeChart from '../components/ProdutividadeChart';
import ProdutividadeBarChart from '../components/ProdutividadeBarChart';
import DateFilter from '../components/DateFilter';

const Produtividade = () => {
    const [filterDates, setFilterDates] = useState(null); // { start, end } ou null para todos
    const [filterInitialized, setFilterInitialized] = useState(false);

    const handleDateChange = (filterData) => {
        const dates = {
            start: filterData.startDate,
            end: filterData.endDate
        };
        setFilterDates(dates);
        if (!filterInitialized) {
            setFilterInitialized(true);
        }
    };

    return (
        <div className="space-y-6 px-4">
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Produtividade do Agente</h2>
                        <p className="text-slate-500">Análise detalhada de valor recebido, número de acordos e distribuição por blocos</p>
                    </div>
                </div>

                {/* Filtro de Data */}
                <div className="mb-6">
                    <DateFilter 
                        onFilterChange={handleDateChange}
                        initialStartDate={filterDates?.start}
                        initialEndDate={filterDates?.end}
                    />
                </div>

                {/* Componentes de Produtividade */}
                {filterInitialized && (
                    <div className="space-y-6">
                        <ProdutividadeChart 
                            startDate={filterDates?.start} 
                            endDate={filterDates?.end} 
                        />
                        <ProdutividadeBarChart 
                            startDate={filterDates?.start} 
                            endDate={filterDates?.end} 
                        />
                    </div>
                )}
            </section>
        </div>
    );
};

export default Produtividade;

