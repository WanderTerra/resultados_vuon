const { getDB } = require('../config/db');

async function testAcordosPagamentos() {
    console.log('🚀 Testando queries de acordos e pagamentos...\n');
    
    try {
        const db = await getDB();
        console.log('✅ Database connection established\n');
        
        const bloco = 1;
        const blocoName = String(bloco);
        const acordosViewName = `v_bloco${blocoName}_acordos`;
        const pagamentosViewName = `v_bloco${blocoName}_pagamentos`;
        
        // Teste 1: Verificar se as views existem
        console.log('======================================================================');
        console.log('📊 TESTE 1: Verificando se as views existem');
        console.log('======================================================================\n');
        
        try {
            const [acordosCheck] = await db.execute(`SELECT 1 FROM ${acordosViewName} LIMIT 1`);
            console.log(`✅ View ${acordosViewName} existe`);
        } catch (error) {
            console.log(`❌ View ${acordosViewName} não existe: ${error.message}`);
        }
        
        try {
            const [pagamentosCheck] = await db.execute(`SELECT 1 FROM ${pagamentosViewName} LIMIT 1`);
            console.log(`✅ View ${pagamentosViewName} existe`);
        } catch (error) {
            console.log(`❌ View ${pagamentosViewName} não existe: ${error.message}`);
        }
        
        // Teste 2: Buscar acordos sem filtros
        console.log('\n======================================================================');
        console.log('📊 TESTE 2: Buscar acordos sem filtros');
        console.log('======================================================================\n');
        
        const acordosQuery = `
            SELECT 
                date_month as date,
                date_formatted,
                SUM(total_acordos) as total_acordos
            FROM ${acordosViewName}
            GROUP BY ano, mes, date_month, date_formatted
            ORDER BY ano ASC, mes ASC
            LIMIT 10
        `;
        
        try {
            const [acordosRows] = await db.execute(acordosQuery);
            console.log(`✅ Acordos encontrados: ${acordosRows.length}`);
            if (acordosRows.length > 0) {
                acordosRows.forEach(row => {
                    console.log(`   ${row.date_formatted || row.date}: ${row.total_acordos} acordos`);
                });
            }
        } catch (error) {
            console.log(`❌ Erro ao buscar acordos: ${error.message}`);
        }
        
        // Teste 3: Buscar pagamentos sem filtros
        console.log('\n======================================================================');
        console.log('📊 TESTE 3: Buscar pagamentos sem filtros');
        console.log('======================================================================\n');
        
        const pagamentosQuery = `
            SELECT 
                date_month as date,
                date_formatted,
                SUM(quantidade_pagamentos) as quantidade_pagamentos
            FROM ${pagamentosViewName}
            GROUP BY ano, mes, date_month, date_formatted
            ORDER BY ano ASC, mes ASC
            LIMIT 10
        `;
        
        try {
            const [pagamentosRows] = await db.execute(pagamentosQuery);
            console.log(`✅ Pagamentos encontrados: ${pagamentosRows.length}`);
            if (pagamentosRows.length > 0) {
                pagamentosRows.forEach(row => {
                    console.log(`   ${row.date_formatted || row.date}: ${row.quantidade_pagamentos} pagamentos`);
                });
            }
        } catch (error) {
            console.log(`❌ Erro ao buscar pagamentos: ${error.message}`);
        }
        
        // Teste 4: Comparar formatos de data
        console.log('\n======================================================================');
        console.log('📊 TESTE 4: Comparar formatos de data');
        console.log('======================================================================\n');
        
        const summaryQuery = `
            SELECT 
                date_formatted,
                ano,
                mes
            FROM bloco_summary
            WHERE bloco = ?
            ORDER BY ano ASC, mes ASC
            LIMIT 5
        `;
        
        try {
            const [summaryRows] = await db.execute(summaryQuery, [blocoName]);
            console.log(`✅ Dados da tabela materializada (primeiros 5):`);
            summaryRows.forEach(row => {
                console.log(`   ${row.date_formatted} (ano=${row.ano}, mes=${row.mes})`);
            });
        } catch (error) {
            console.log(`❌ Erro ao buscar da tabela materializada: ${error.message}`);
        }
        
        console.log('\n✅ Teste concluído!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        process.exit(1);
    }
}

testAcordosPagamentos();



