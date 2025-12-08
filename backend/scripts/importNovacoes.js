const { getDB } = require('../config/db');
const fs = require('fs');
const path = require('path');

// Função para ler CSV
const lerCSV = (caminhoArquivo) => {
    const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
    const linhas = conteudo.split('\n').filter(linha => linha.trim());
    
    if (linhas.length === 0) return [];
    
    // Detectar delimitador (vírgula ou ponto e vírgula)
    const primeiraLinha = linhas[0];
    const usaPontoVirgula = primeiraLinha.split(';').length > primeiraLinha.split(',').length;
    const delimitador = usaPontoVirgula ? ';' : ',';
    
    // Ler cabeçalho
    const cabecalhos = linhas[0].split(delimitador).map(h => h.trim().replace(/"/g, ''));
    
    // Ler dados
    const dados = [];
    for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(delimitador).map(v => v.trim().replace(/"/g, ''));
        if (valores.length === cabecalhos.length) {
            const registro = {};
            cabecalhos.forEach((cabecalho, idx) => {
                registro[cabecalho] = valores[idx] || '';
            });
            dados.push(registro);
        }
    }
    
    return dados;
};

/**
 * Script para importar dados de novações de uma planilha Excel/CSV
 * Caminho padrão: K:\RPA VUON\Novações\2025-12-04
 */
const importNovacoes = async (pastaPath) => {
    try {
        console.log('📥 Iniciando importação de novações...\n');
        
        // Usar caminho padrão se não fornecido
        const caminhoPasta = pastaPath || 'K:\\RPA VUON\\Novações\\2025-12-04';
        
        console.log(`📂 Procurando arquivos em: ${caminhoPasta}\n`);
        
        // Verificar se a pasta existe
        if (!fs.existsSync(caminhoPasta)) {
            console.error(`❌ Pasta não encontrada: ${caminhoPasta}`);
            console.error('   Verifique se o caminho está correto.\n');
            process.exit(1);
        }
        
        // Listar arquivos na pasta (priorizar CSV)
        const arquivos = fs.readdirSync(caminhoPasta)
            .filter(arquivo => {
                const extensao = path.extname(arquivo).toLowerCase();
                return ['.csv', '.xlsx', '.xls'].includes(extensao);
            })
            .sort((a, b) => {
                // Priorizar CSV
                const aIsCSV = a.toLowerCase().endsWith('.csv');
                const bIsCSV = b.toLowerCase().endsWith('.csv');
                if (aIsCSV && !bIsCSV) return -1;
                if (!aIsCSV && bIsCSV) return 1;
                return a.localeCompare(b);
            });
        
        if (arquivos.length === 0) {
            console.error(`❌ Nenhum arquivo Excel/CSV encontrado em: ${caminhoPasta}`);
            process.exit(1);
        }
        
        console.log(`📄 Arquivos encontrados: ${arquivos.length}`);
        arquivos.forEach((arquivo, idx) => {
            console.log(`   ${idx + 1}. ${arquivo}`);
        });
        console.log('');
        
        // Conectar ao banco
        const db = await getDB();
        
        // Limpar tabela antes de importar
        console.log('🗑️  Limpando tabela vuon_novacoes...');
        await db.execute('DELETE FROM vuon_novacoes');
        console.log('✅ Tabela limpa!\n');
        
        let totalInseridos = 0;
        
        // Processar cada arquivo
        for (const arquivo of arquivos) {
            const caminhoCompleto = path.join(caminhoPasta, arquivo);
            console.log(`📖 Processando: ${arquivo}...`);
            
            try {
                // Ler arquivo (CSV ou Excel)
                let dados = [];
                const extensao = path.extname(arquivo).toLowerCase();
                
                if (extensao === '.csv') {
                    // Ler CSV
                    dados = lerCSV(caminhoCompleto);
                    console.log(`   📄 Formato: CSV`);
                } else {
                    // Ler Excel (se xlsx estiver instalado)
                    try {
                        const XLSX = require('xlsx');
                        const workbook = XLSX.readFile(caminhoCompleto);
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        dados = XLSX.utils.sheet_to_json(worksheet);
                        console.log(`   📄 Formato: Excel`);
                    } catch (error) {
                        console.error(`   ❌ Erro ao ler Excel: ${error.message}`);
                        console.error(`   💡 Instale xlsx: npm install xlsx`);
                        continue;
                    }
                }
                
                console.log(`   📊 Linhas encontradas: ${dados.length}`);
                
                if (dados.length === 0) {
                    console.log(`   ⚠️  Arquivo vazio, pulando...\n`);
                    continue;
                }
                
                // Mostrar primeira linha para debug (cabeçalhos)
                if (dados.length > 0) {
                    console.log(`   📋 Colunas encontradas: ${Object.keys(dados[0]).join(', ')}`);
                }
                
                // Preparar dados para inserção
                // Mapear colunas do CSV para colunas da tabela
                const registros = dados.map(row => {
                    // Normalizar CPF/CNPJ (remover pontos, traços e espaços)
                    const cpfCnpjRaw = (row['CPF / CNPJ'] || row['CPF/CNPJ'] || row['cpf_cnpj'] || '').toString().trim();
                    const cpfCnpj = cpfCnpjRaw.replace(/[.\-\s]/g, ''); // Remove pontos, traços e espaços
                    
                    // Normalizar data (pode vir com hora: DD/MM/YYYY HH:MM:SS)
                    const dataEmissaoRaw = (row['Data de Emissão'] || row['data_emissao'] || row['Data Emissão'] || '').toString().trim();
                    const dataEmissao = dataEmissaoRaw.split(' ')[0]; // Pega apenas a parte da data (antes do espaço)
                    
                    // Normalizar valor (remover R$, espaços e converter vírgula para ponto)
                    const valorTotalRaw = (row['Valor Total'] || row['valor_total'] || row['Valor'] || '0').toString().trim();
                    const valorTotal = parseFloat(valorTotalRaw.replace(/[R$\s]/g, '').replace(',', '.')) || 0;
                    
                    const atrasoReal = parseInt((row['Atraso Real'] || row['atraso_real'] || row['Atraso'] || '0').toString()) || 0;
                    const tipo = (row['Tipo'] || row['tipo'] || 'NOV').toString().trim();
                    const nome = (row['Nome'] || row['nome'] || row['Cliente'] || '').toString().trim();
                    const agente = (row['Agente'] || row['agente'] || '').toString().trim();
                    
                    // Converter data de formato brasileiro (DD/MM/YYYY) para formato MySQL (YYYY-MM-DD)
                    let dataEmissaoFormatada = null;
                    if (dataEmissao) {
                        // Formato DD/MM/YYYY (com ou sem hora)
                        if (dataEmissao.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            const [dia, mes, ano] = dataEmissao.split('/');
                            dataEmissaoFormatada = `${ano}-${mes}-${dia}`;
                        } 
                        // Formato DD/MM/YY
                        else if (dataEmissao.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
                            const [dia, mes, ano] = dataEmissao.split('/');
                            const anoCompleto = parseInt(ano) < 50 ? `20${ano}` : `19${ano}`;
                            dataEmissaoFormatada = `${anoCompleto}-${mes}-${dia}`;
                        }
                        // Já está no formato YYYY-MM-DD
                        else if (dataEmissao.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            dataEmissaoFormatada = dataEmissao;
                        }
                    }
                    
                    // Mapear outras colunas do CSV
                    const credor = (row['Credor'] || row['credor'] || '').toString().trim();
                    const filial = parseInt((row['Filial'] || row['filial'] || '0').toString()) || 0;
                    const tituloContrato = (row['Título / Contrato'] || row['Título/Contrato'] || row['titulo_contrato'] || '').toString().trim();
                    const plano = parseInt((row['Plano'] || row['plano'] || '0').toString()) || 0;
                    const vencimentoEntradaRaw = (row['Vencimento Entrada'] || row['vencimento_entrada'] || '').toString().trim();
                    const valorEntradaRaw = (row['Valor Entrada'] || row['valor_entrada'] || '0').toString().trim();
                    const fase = (row['Fase'] || row['fase'] || '').toString().trim();
                    
                    // Converter vencimento_entrada (DD/MM/YYYY)
                    let vencimentoEntradaFormatada = null;
                    if (vencimentoEntradaRaw) {
                        const vencData = vencimentoEntradaRaw.split(' ')[0];
                        if (vencData.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            const [dia, mes, ano] = vencData.split('/');
                            vencimentoEntradaFormatada = `${ano}-${mes}-${dia}`;
                        }
                    }
                    
                    // Converter valor_entrada
                    const valorEntrada = parseFloat(valorEntradaRaw.replace(/[R$\s]/g, '').replace(',', '.')) || 0;
                    
                    return {
                        credor: credor,
                        filial: filial,
                        tipo: tipo,
                        titulo_contrato: tituloContrato,
                        valor_total: valorTotal,
                        plano: plano,
                        vencimento_entrada: vencimentoEntradaFormatada,
                        valor_entrada: valorEntrada,
                        data_emissao: dataEmissaoFormatada,
                        fase: fase,
                        cpf_cnpj: cpfCnpj,
                        nome: nome,
                        agente: agente || null,
                        atraso_real: atrasoReal,
                    };
                }).filter(row => {
                    // Filtrar linhas inválidas (sem CPF ou data)
                    const temCPF = row.cpf_cnpj && row.cpf_cnpj.length > 0;
                    const temData = row.data_emissao && row.data_emissao && row.data_emissao.length > 0;
                    
                    if (!temCPF || !temData) {
                        return false;
                    }
                    
                    return true;
                });
                
                console.log(`   ✅ Registros válidos: ${registros.length}`);
                
                // Mostrar exemplo de registro para debug
                if (registros.length > 0) {
                    console.log(`   📋 Exemplo de registro (primeiro):`);
                    console.log(`      CPF: ${registros[0].cpf_cnpj}`);
                    console.log(`      Nome: ${registros[0].nome}`);
                    console.log(`      Data: ${registros[0].data_emissao}`);
                    console.log(`      Valor: R$ ${registros[0].valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
                    console.log(`      Atraso: ${registros[0].atraso_real} dias`);
                } else {
                    console.log(`   ⚠️  Nenhum registro válido após filtragem.`);
                    console.log(`   💡 Verificando primeiros registros brutos...`);
                    if (dados.length > 0) {
                        console.log(`      Primeiro registro bruto:`, dados[0]);
                        console.log(`      CPF encontrado: "${dados[0]['CPF / CNPJ'] || dados[0]['CPF/CNPJ'] || 'NÃO ENCONTRADO'}"`);
                        console.log(`      Data encontrada: "${dados[0]['Data de Emissão'] || dados[0]['data_emissao'] || 'NÃO ENCONTRADO'}"`);
                    }
                }
                
                if (registros.length === 0) {
                    console.log(`   ⚠️  Nenhum registro válido encontrado, pulando...\n`);
                    continue;
                }
                
                // Inserir em lotes para melhor performance
                const tamanhoLote = 1000;
                let inseridosArquivo = 0;
                
                for (let i = 0; i < registros.length; i += tamanhoLote) {
                    const lote = registros.slice(i, i + tamanhoLote);
                    
                    // Preparar valores para inserção em lote usando prepared statements
                    const valores = [];
                    const placeholders = [];
                    
                    for (const row of lote) {
                        valores.push(
                            row.credor || null,
                            row.filial || 0,
                            row.tipo || 'NOV',
                            row.titulo_contrato || null,
                            row.valor_total || 0,
                            row.plano || 0,
                            row.vencimento_entrada || null,
                            row.valor_entrada || 0,
                            row.data_emissao || null,
                            row.fase || null,
                            row.cpf_cnpj || '',
                            row.nome || '',
                            row.agente || null,
                            row.atraso_real || 0
                        );
                        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    }
                    
                    const query = `
                        INSERT INTO vuon_novacoes 
                        (credor, filial, tipo, titulo_contrato, valor_total, plano, vencimento_entrada, valor_entrada, data_emissao, fase, cpf_cnpj, nome, agente, atraso_real)
                        VALUES ${placeholders.join(', ')}
                    `;
                    
                    await db.execute(query, valores);
                    inseridosArquivo += lote.length;
                }
                
                totalInseridos += inseridosArquivo;
                console.log(`   ✅ ${inseridosArquivo.toLocaleString('pt-BR')} registros inseridos!\n`);
                
            } catch (error) {
                console.error(`   ❌ Erro ao processar ${arquivo}:`, error.message);
                console.error(`   Continuando com próximo arquivo...\n`);
            }
        }
        
        // Verificar total inserido
        const [count] = await db.execute('SELECT COUNT(*) as total FROM vuon_novacoes');
        console.log('✅ Importação concluída!');
        console.log(`   Total de registros inseridos: ${totalInseridos.toLocaleString('pt-BR')}`);
        console.log(`   Total na tabela: ${count[0].total.toLocaleString('pt-BR')}\n`);
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erro na importação:');
        console.error('   Mensagem:', error.message);
        console.error('   Stack:', error.stack);
        process.exit(1);
    }
};

// Pegar caminho da pasta como argumento ou usar padrão
const pastaPath = process.argv[2];
importNovacoes(pastaPath);

