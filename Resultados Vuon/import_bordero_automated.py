#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script automatizado para importar dados de bordero de pagamento do VUON para MariaDB via SSH tunnel
Processa automaticamente todas as pastas em K:\RPA VUON\pagamentos\
Executa continuamente verificando novas pastas a cada 5 minutos
"""

import sys
import os
import time
import glob
import pymysql
from sshtunnel import SSHTunnelForwarder
import pandas as pd
import numpy as np
from datetime import datetime, date
from dotenv import load_dotenv
import re

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# Configurações de conexão (lidas do arquivo .env)
SSH_HOST = os.getenv('SSH_HOST')
SSH_PORT = int(os.getenv('SSH_PORT', 22))
SSH_USER = os.getenv('SSH_USER')
SSH_PASSWORD = os.getenv('SSH_PASSWORD')

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_NAME = os.getenv('DB_NAME', 'vuon')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')

# Configurações de processamento
BASE_PATH = r'K:\RPA VUON\pagamentos'
CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', 300))  # 5 minutos em segundos
BATCH_SIZE = int(os.getenv('BATCH_SIZE', 1000))  # Inserir dados em lotes

# Validar variáveis obrigatórias
required_vars = ['SSH_HOST', 'SSH_USER', 'SSH_PASSWORD', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
missing_vars = [var for var in required_vars if not os.getenv(var)]
if missing_vars:
    print(f"❌ ERRO: Variáveis de ambiente faltando no arquivo .env: {', '.join(missing_vars)}")
    print("Por favor, configure o arquivo .env corretamente.")
    sys.exit(1)


def create_ssh_tunnel():
    """Cria e retorna o túnel SSH"""
    tunnel = SSHTunnelForwarder(
        (SSH_HOST, SSH_PORT),
        ssh_username=SSH_USER,
        ssh_password=SSH_PASSWORD,
        remote_bind_address=(DB_HOST, DB_PORT),
        local_bind_address=('127.0.0.1', 0)
    )
    tunnel.start()
    return tunnel


def connect_to_db(tunnel):
    """Conecta ao MariaDB através do túnel SSH"""
    connection = pymysql.connect(
        host='127.0.0.1',
        port=tunnel.local_bind_port,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    return connection


def create_tables(connection):
    """Cria as tabelas necessárias se não existirem"""
    # Tabela de bordero de pagamento
    create_bordero_sql = """
    CREATE TABLE IF NOT EXISTS vuon_bordero_pagamento (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credor VARCHAR(50) COMMENT 'Credor (ex: VUONC)',
        filial INT COMMENT 'Filial',
        cpf_cnpj VARCHAR(20) COMMENT 'CPF ou CNPJ do cliente',
        nome VARCHAR(255) COMMENT 'Nome do cliente',
        tipo VARCHAR(10) COMMENT 'Tipo (ex: NOV)',
        titulo VARCHAR(100) COMMENT 'Número do título (número muito grande)',
        parcela INT COMMENT 'Número da parcela',
        plano INT COMMENT 'Número do plano',
        vencimento DATE COMMENT 'Data de vencimento',
        atraso INT COMMENT 'Dias de atraso (pode ser negativo para pagamento antecipado)',
        data_pagamento DATE COMMENT 'Data do pagamento',
        valor_recebido DECIMAL(15, 2) COMMENT 'Valor recebido',
        encargos DECIMAL(15, 2) COMMENT 'Encargos',
        descontos DECIMAL(15, 2) COMMENT 'Descontos',
        comissao DECIMAL(15, 2) COMMENT 'Comissão',
        repasse DECIMAL(15, 2) COMMENT 'Valor de repasse',
        agente INT COMMENT 'Código do agente',
        matricula INT COMMENT 'Matrícula',
        vcto_real DATE COMMENT 'Vencimento real',
        atraso_real INT COMMENT 'Atraso real em dias',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
        
        -- Índices para otimizar consultas
        INDEX idx_cpf_cnpj (cpf_cnpj),
        INDEX idx_data_pagamento (data_pagamento),
        INDEX idx_vencimento (vencimento),
        INDEX idx_agente (agente),
        INDEX idx_matricula (matricula),
        INDEX idx_titulo (titulo),
        INDEX idx_credor (credor),
        INDEX idx_agente_matricula (agente, matricula),
        INDEX idx_data_pagamento_vencimento (data_pagamento, vencimento),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Tabela de bordero de pagamento do VUON';
    """
    
    # Tabela de controle de importações
    create_importacoes_sql = """
    CREATE TABLE IF NOT EXISTS vuon_bordero_importacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data_pasta DATE NOT NULL UNIQUE COMMENT 'Data da pasta (formato YYYY-MM-DD)',
        arquivo_processado VARCHAR(255) NOT NULL COMMENT 'Nome do arquivo CSV processado',
        status ENUM('processando', 'sucesso', 'erro') NOT NULL DEFAULT 'processando',
        registros_inseridos INT DEFAULT 0 COMMENT 'Quantidade de registros inseridos',
        data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data/hora da importação',
        erro_mensagem TEXT COMMENT 'Mensagem de erro se houver',
        tentativas INT DEFAULT 1 COMMENT 'Número de tentativas de importação',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_data_pasta (data_pasta),
        INDEX idx_status (status),
        INDEX idx_data_importacao (data_importacao)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Tabela de controle de importações de arquivos CSV de bordero de pagamento do VUON';
    """
    
    with connection.cursor() as cursor:
        cursor.execute(create_bordero_sql)
        cursor.execute(create_importacoes_sql)
        connection.commit()


def check_already_processed(connection, data_pasta):
    """Verifica se uma pasta já foi processada com sucesso"""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT status FROM vuon_bordero_importacoes WHERE data_pasta = %s",
            (data_pasta,)
        )
        result = cursor.fetchone()
        if result:
            return result['status'] == 'sucesso'
        return False


def mark_as_processing(connection, data_pasta, arquivo):
    """Marca uma importação como processando"""
    with connection.cursor() as cursor:
        cursor.execute(
            """INSERT INTO vuon_bordero_importacoes (data_pasta, arquivo_processado, status, tentativas)
               VALUES (%s, %s, 'processando', 1)
               ON DUPLICATE KEY UPDATE 
               status = 'processando', 
               tentativas = tentativas + 1,
               updated_at = CURRENT_TIMESTAMP""",
            (data_pasta, arquivo)
        )
        connection.commit()


def mark_as_success(connection, data_pasta, registros_inseridos):
    """Marca uma importação como sucesso"""
    with connection.cursor() as cursor:
        cursor.execute(
            """UPDATE vuon_bordero_importacoes 
               SET status = 'sucesso', 
                   registros_inseridos = %s,
                   data_importacao = CURRENT_TIMESTAMP,
                   erro_mensagem = NULL,
                   updated_at = CURRENT_TIMESTAMP
               WHERE data_pasta = %s""",
            (registros_inseridos, data_pasta)
        )
        connection.commit()


def mark_as_error(connection, data_pasta, erro_mensagem):
    """Marca uma importação como erro"""
    with connection.cursor() as cursor:
        cursor.execute(
            """UPDATE vuon_bordero_importacoes 
               SET status = 'erro', 
                   erro_mensagem = %s,
                   updated_at = CURRENT_TIMESTAMP
               WHERE data_pasta = %s""",
            (str(erro_mensagem)[:500], data_pasta)  # Limitar tamanho da mensagem
        )
        connection.commit()


def get_folders_to_process():
    """Retorna lista de pastas no formato YYYY-MM-DD que precisam ser processadas"""
    if not os.path.exists(BASE_PATH):
        print(f"⚠️  Caminho não encontrado: {BASE_PATH}")
        return []
    
    folders = []
    pattern = re.compile(r'^\d{4}-\d{2}-\d{2}$')
    
    for item in os.listdir(BASE_PATH):
        folder_path = os.path.join(BASE_PATH, item)
        if os.path.isdir(folder_path) and pattern.match(item):
            folders.append(item)
    
    return sorted(folders)


def find_csv_file(folder_path):
    """Encontra o primeiro arquivo CSV na pasta (qualquer nome)"""
    csv_files = glob.glob(os.path.join(folder_path, '*.csv'))
    if csv_files:
        return csv_files[0]  # Retorna o primeiro CSV encontrado
    return None


def convert_monetary_value(value_str):
    """Converte valor monetário de 'R$213,46' para 213.46"""
    if pd.isna(value_str) or value_str == '' or value_str == '-':
        return None
    try:
        # Remover R$ e espaços
        cleaned = str(value_str).replace('R$', '').strip()
        # Remover pontos (separadores de milhar) e substituir vírgula por ponto
        cleaned = cleaned.replace('.', '').replace(',', '.')
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


def convert_date(date_str):
    """Converte data de '05/05/2025' para formato DATE"""
    if pd.isna(date_str) or date_str == '' or date_str == '-':
        return None
    try:
        return datetime.strptime(str(date_str), '%d/%m/%Y').date()
    except (ValueError, AttributeError):
        return None


def convert_int(value):
    """Converte valor para inteiro, tratando '-' como None"""
    if pd.isna(value) or value == '' or value == '-':
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def convert_string(value):
    """Converte valor para string, tratando '-' como None"""
    if pd.isna(value) or value == '' or value == '-':
        return None
    return str(value).strip()


def clean_value(value):
    """Converte NaN/None para None explicitamente"""
    if pd.isna(value) or value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    return value


def read_bordero_csv(csv_file):
    """Lê o arquivo CSV de bordero de pagamento e processa os dados"""
    try:
        # Ler CSV com pandas
        df = pd.read_csv(
            csv_file,
            sep=';',
            encoding='utf-8',
            dtype=str,
            engine='python'
        )
        
        # Renomear colunas para nomes em minúsculas com underscore
        column_mapping = {
            'Credor': 'credor',
            'Filial': 'filial',
            'CPF / CNPJ': 'cpf_cnpj',
            'Nome': 'nome',
            'Tipo': 'tipo',
            'Título': 'titulo',
            'Parcela': 'parcela',
            'Plano': 'plano',
            'Vencimento': 'vencimento',
            'Atraso': 'atraso',
            'Data Pagamento': 'data_pagamento',
            'Valor Recebido': 'valor_recebido',
            'Encargos': 'encargos',
            'Descontos': 'descontos',
            'Comissão': 'comissao',
            'Repasse': 'repasse',
            'Agente': 'agente',
            'Matrícula': 'matricula',
            'Vcto REAL': 'vcto_real',
            'Atraso REAL': 'atraso_real'
        }
        
        df.rename(columns=column_mapping, inplace=True)
        
        # Garantir que todas as colunas necessárias existam
        required_columns = list(column_mapping.values())
        for col in required_columns:
            if col not in df.columns:
                df[col] = None
        
        # Converter valores
        df['valor_recebido'] = df['valor_recebido'].apply(convert_monetary_value)
        df['encargos'] = df['encargos'].apply(convert_monetary_value)
        df['descontos'] = df['descontos'].apply(convert_monetary_value)
        df['comissao'] = df['comissao'].apply(convert_monetary_value)
        df['repasse'] = df['repasse'].apply(convert_monetary_value)
        
        df['vencimento'] = df['vencimento'].apply(convert_date)
        df['data_pagamento'] = df['data_pagamento'].apply(convert_date)
        df['vcto_real'] = df['vcto_real'].apply(convert_date)
        
        df['filial'] = df['filial'].apply(convert_int)
        df['parcela'] = df['parcela'].apply(convert_int)
        df['plano'] = df['plano'].apply(convert_int)
        df['atraso'] = df['atraso'].apply(convert_int)
        df['agente'] = df['agente'].apply(convert_int)
        df['matricula'] = df['matricula'].apply(convert_int)
        df['atraso_real'] = df['atraso_real'].apply(convert_int)
        
        # Strings
        df['credor'] = df['credor'].apply(convert_string)
        df['cpf_cnpj'] = df['cpf_cnpj'].apply(convert_string)
        df['nome'] = df['nome'].apply(convert_string)
        df['tipo'] = df['tipo'].apply(convert_string)
        df['titulo'] = df['titulo'].apply(convert_string)
        
        # Substituir NaN por None para SQL - garantir que todos os NaN sejam None
        df = df.replace([np.nan, pd.NA], None)
        df = df.where(pd.notnull(df), None)
        
        return df
        
    except Exception as e:
        print(f"  ❌ Erro ao ler CSV: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def insert_bordero_batch(connection, df):
    """Insere dados em lote no banco de dados"""
    insert_sql = """
    INSERT INTO vuon_bordero_pagamento 
    (credor, filial, cpf_cnpj, nome, tipo, titulo, parcela, plano,
     vencimento, atraso, data_pagamento, valor_recebido, encargos,
     descontos, comissao, repasse, agente, matricula, vcto_real, atraso_real)
    VALUES 
    (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    total_records = len(df)
    inserted = 0
    errors = 0
    
    with connection.cursor() as cursor:
        for i in range(0, total_records, BATCH_SIZE):
            batch = df.iloc[i:i + BATCH_SIZE]
            
            try:
                batch_data = []
                for _, row in batch.iterrows():
                    # Garantir que todos os valores NaN sejam None
                    batch_data.append((
                        clean_value(row['credor']),
                        clean_value(row['filial']),
                        clean_value(row['cpf_cnpj']),
                        clean_value(row['nome']),
                        clean_value(row['tipo']),
                        clean_value(row['titulo']),
                        clean_value(row['parcela']),
                        clean_value(row['plano']),
                        clean_value(row['vencimento']),
                        clean_value(row['atraso']),
                        clean_value(row['data_pagamento']),
                        clean_value(row['valor_recebido']),
                        clean_value(row['encargos']),
                        clean_value(row['descontos']),
                        clean_value(row['comissao']),
                        clean_value(row['repasse']),
                        clean_value(row['agente']),
                        clean_value(row['matricula']),
                        clean_value(row['vcto_real']),
                        clean_value(row['atraso_real'])
                    ))
                
                cursor.executemany(insert_sql, batch_data)
                connection.commit()
                inserted += len(batch_data)
                
            except Exception as e:
                errors += len(batch)
                connection.rollback()
                raise e
    
    return inserted, errors


def process_folder(connection, folder_date):
    """Processa uma pasta específica"""
    folder_path = os.path.join(BASE_PATH, folder_date)
    csv_file = find_csv_file(folder_path)
    
    if not csv_file:
        raise FileNotFoundError(f"Arquivo CSV não encontrado na pasta {folder_date}")
    
    print(f"  📄 Processando arquivo: {os.path.basename(csv_file)}")
    
    # Ler e processar CSV
    df = read_bordero_csv(csv_file)
    print(f"  📊 Total de registros no CSV: {len(df)}")
    
    # Inserir dados
    inserted, errors = insert_bordero_batch(connection, df)
    
    if errors > 0:
        raise Exception(f"Erros ao inserir {errors} registros")
    
    return inserted


def process_all_folders(connection):
    """Processa todas as pastas que ainda não foram processadas"""
    folders = get_folders_to_process()
    
    if not folders:
        print("  ℹ️  Nenhuma pasta encontrada para processar")
        return
    
    print(f"  📁 Encontradas {len(folders)} pastas")
    
    processed = 0
    skipped = 0
    errors = 0
    
    for folder_date in folders:
        try:
            # Verificar se já foi processada
            if check_already_processed(connection, folder_date):
                print(f"  ⏭️  Pasta {folder_date} já processada - pulando")
                skipped += 1
                continue
            
            print(f"\n  🔄 Processando pasta: {folder_date}")
            
            # Marcar como processando
            folder_path = os.path.join(BASE_PATH, folder_date)
            csv_file = find_csv_file(folder_path)
            if csv_file:
                mark_as_processing(connection, folder_date, os.path.basename(csv_file))
            
            # Processar pasta
            registros_inseridos = process_folder(connection, folder_date)
            
            # Marcar como sucesso
            mark_as_success(connection, folder_date, registros_inseridos)
            print(f"  ✅ Pasta {folder_date} processada com sucesso! ({registros_inseridos} registros)")
            processed += 1
            
        except Exception as e:
            errors += 1
            error_msg = str(e)
            print(f"  ❌ Erro ao processar pasta {folder_date}: {error_msg}")
            mark_as_error(connection, folder_date, error_msg)
    
    print(f"\n  📊 Resumo: {processed} processadas, {skipped} puladas, {errors} erros")


def main_loop():
    """Loop principal de execução contínua"""
    tunnel = None
    connection = None
    
    print("=" * 60)
    print("🚀 Importador Automatizado Bordero de Pagamento VUON - Iniciando...")
    print("=" * 60)
    print(f"📂 Caminho base: {BASE_PATH}")
    print(f"⏱️  Intervalo de verificação: {CHECK_INTERVAL} segundos ({CHECK_INTERVAL // 60} minutos)")
    print(f"💾 Banco de dados: {DB_NAME}")
    print("=" * 60)
    
    try:
        # Criar túnel SSH
        print("\n🔐 Estabelecendo túnel SSH...")
        tunnel = create_ssh_tunnel()
        print(f"✅ Túnel SSH estabelecido (porta local: {tunnel.local_bind_port})")
        
        # Conectar ao banco
        print("💾 Conectando ao MariaDB...")
        connection = connect_to_db(tunnel)
        print("✅ Conectado ao MariaDB")
        
        # Criar tabelas
        print("📋 Criando/verificando tabelas...")
        create_tables(connection)
        print("✅ Tabelas verificadas")
        
        cycle = 0
        
        # Loop infinito
        while True:
            cycle += 1
            print(f"\n{'=' * 60}")
            print(f"🔄 Ciclo #{cycle} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"{'=' * 60}")
            
            try:
                process_all_folders(connection)
            except Exception as e:
                print(f"❌ Erro no ciclo #{cycle}: {str(e)}")
                import traceback
                traceback.print_exc()
            
            print(f"\n⏳ Aguardando {CHECK_INTERVAL} segundos até a próxima verificação...")
            time.sleep(CHECK_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrompido pelo usuário (Ctrl+C)")
    except Exception as e:
        print(f"\n❌ Erro fatal: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Fechar conexões
        if connection:
            connection.close()
            print("🔌 Conexão com MariaDB fechada")
        if tunnel:
            tunnel.stop()
            print("🔌 Túnel SSH fechado")
        print("\n👋 Encerrando...")


if __name__ == '__main__':
    main_loop()



