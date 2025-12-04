#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script automatizado para importar dados de CSV do VUON para MariaDB via SSH tunnel
Processa automaticamente todas as pastas em K:\RPA VUON\planilhas_por_dia\
Executa continuamente verificando novas pastas a cada 5 minutos
"""

import sys
import os
import time
import glob
import csv
import pymysql
from sshtunnel import SSHTunnelForwarder
import pandas as pd
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
BASE_PATH = r'K:\RPA VUON\planilhas_por_dia'
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
    # Tabela de resultados
    create_resultados_sql = """
    CREATE TABLE IF NOT EXISTS vuon_resultados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255),
        codigo VARCHAR(50),
        cpf_cnpj VARCHAR(20),
        agente VARCHAR(50),
        acao VARCHAR(10),
        data DATE,
        hora TIME,
        historico TEXT,
        fone_discado VARCHAR(50),
        credor VARCHAR(50),
        atraso INT,
        valor DECIMAL(15, 2),
        inclusao DATE,
        cdec VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cpf_cnpj (cpf_cnpj),
        INDEX idx_data (data),
        INDEX idx_codigo (codigo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
    
    # Tabela de controle de importações
    create_importacoes_sql = """
    CREATE TABLE IF NOT EXISTS vuon_importacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data_pasta DATE NOT NULL UNIQUE,
        arquivo_processado VARCHAR(255) NOT NULL,
        status ENUM('processando', 'sucesso', 'erro') NOT NULL DEFAULT 'processando',
        registros_inseridos INT DEFAULT 0,
        data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        erro_mensagem TEXT,
        tentativas INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_data_pasta (data_pasta),
        INDEX idx_status (status),
        INDEX idx_data_importacao (data_importacao)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
    
    with connection.cursor() as cursor:
        cursor.execute(create_resultados_sql)
        cursor.execute(create_importacoes_sql)
        connection.commit()


def check_already_processed(connection, data_pasta):
    """Verifica se uma pasta já foi processada com sucesso"""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT status FROM vuon_importacoes WHERE data_pasta = %s",
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
            """INSERT INTO vuon_importacoes (data_pasta, arquivo_processado, status, tentativas)
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
            """UPDATE vuon_importacoes 
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
            """UPDATE vuon_importacoes 
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


def find_csv_file(folder_path, folder_date):
    """Encontra o arquivo CSV na pasta baseado no padrão vuon_YYYYMMDD.csv"""
    # Converter YYYY-MM-DD para YYYYMMDD
    date_str = folder_date.replace('-', '')
    filename = f'vuon_{date_str}.csv'
    file_path = os.path.join(folder_path, filename)
    
    if os.path.exists(file_path):
        return file_path
    return None


def convert_monetary_value(value_str):
    """Converte valor monetário de '1.411,75' para 1411.75"""
    if pd.isna(value_str) or value_str == '':
        return None
    try:
        cleaned = str(value_str).replace('.', '').replace(',', '.')
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


def convert_date(date_str):
    """Converte data de '01/05/2025' para formato DATE"""
    if pd.isna(date_str) or date_str == '':
        return None
    try:
        return datetime.strptime(str(date_str), '%d/%m/%Y').date()
    except (ValueError, AttributeError):
        return None


def convert_time(time_str):
    """Converte hora mantendo o formato TIME"""
    if pd.isna(time_str) or time_str == '':
        return None
    try:
        return str(time_str)
    except AttributeError:
        return None


def convert_int(value):
    """Converte valor para inteiro"""
    if pd.isna(value) or value == '':
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def read_and_process_csv(csv_file):
    """Lê o arquivo CSV e processa os dados"""
    # Ler CSV manualmente linha por linha para tratar campos extras
    # Esperamos 16 colunas, mas algumas linhas podem ter 17 (ponto e vírgula extra no Histórico)
    
    expected_columns = 16  # Nome;Cód;CPF/CNPJ;Agente;;Ação;Data;Hora;Histórico;Fone;Credor;Atraso;Valor;Inclusão;CDEC;Fase
    
    rows = []
    skipped_lines = 0
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            # Ler cabeçalho
            header = f.readline().strip()
            
            for line_num, line in enumerate(f, start=2):  # Começa em 2 (após cabeçalho)
                line = line.strip()
                if not line:
                    continue
                
                # Dividir por ponto e vírgula
                fields = line.split(';')
                
                # Se tiver exatamente 16 campos, usar direto
                if len(fields) == expected_columns:
                    rows.append(fields)
                
                # Se tiver mais de 16 campos, tratar: juntar campos extras no Histórico
                elif len(fields) > expected_columns:
                    # Estrutura esperada (16 campos):
                    # 0=Nome, 1=Cód, 2=CPF, 3=Agente, 4=Vazio, 5=Ação, 6=Data, 7=Hora,
                    # 8=Histórico, 9=Fone, 10=Credor, 11=Atraso, 12=Valor, 13=Inclusão, 14=CDEC, 15=Fase
                    # Se tiver 17 campos, o Histórico (índice 8) foi dividido em 2 (8 e 9)
                    
                    processed_fields = []
                    # Primeiros 8 campos (0-7): Nome até Hora
                    processed_fields.extend(fields[:8])
                    
                    # Campo Histórico: juntar campos extras
                    # Se 17 campos: juntar campos 8 e 9
                    num_extra = len(fields) - expected_columns
                    historico_parts = fields[8:8+num_extra+1]  # +1 porque queremos incluir o campo 8+num_extra
                    historico_completo = ';'.join(historico_parts)
                    processed_fields.append(historico_completo)
                    
                    # Resto: Fone, Credor, Atraso, Valor, Inclusão, CDEC, Fase
                    # Incluir Fase também (último campo) para manter 16 campos
                    start_resto = 8 + num_extra + 1
                    processed_fields.extend(fields[start_resto:])  # Inclui todos até o fim (incluindo Fase)
                    
                    # Garantir exatamente 16 campos
                    if len(processed_fields) != expected_columns:
                        if len(processed_fields) > expected_columns:
                            processed_fields = processed_fields[:expected_columns]
                        else:
                            processed_fields.extend([''] * (expected_columns - len(processed_fields)))
                    
                    rows.append(processed_fields)
                
                # Se tiver menos campos, preencher com vazios
                elif len(fields) < expected_columns:
                    fields.extend([''] * (expected_columns - len(fields)))
                    rows.append(fields)
        
        # Criar DataFrame a partir das linhas processadas
        column_names = ['Nome', 'Cód', 'CPF / CNPJ', 'Agente', 'Coluna_Vazia', 'Ação', 'Data', 'Hora', 
                       'Histórico', 'Fone Discado', 'Credor', 'Atraso', 'Valor', 'Inclusão', 'CDEC', 'Fase']
        
        df = pd.DataFrame(rows, columns=column_names, dtype=str)
        
        if skipped_lines > 0:
            print(f"  ⚠️  {skipped_lines} linhas vazias foram puladas")
        
    except Exception as e:
        # Se der erro na leitura manual, tentar com pandas como fallback
        print(f"  ⚠️  Erro na leitura manual, tentando com pandas: {str(e)}")
        try:
            df = pd.read_csv(
                csv_file, 
                sep=';', 
                encoding='utf-8', 
                dtype=str,
                engine='python',
                on_bad_lines='skip',
                warn_bad_lines=False
            )
        except TypeError:
            df = pd.read_csv(
                csv_file, 
                sep=';', 
                encoding='utf-8', 
                dtype=str,
                engine='python',
                error_bad_lines=False,
                warn_bad_lines=False
            )
    
    # Renomear colunas
    column_mapping = {
        'Nome': 'nome',
        'Cód': 'codigo',
        'CPF / CNPJ': 'cpf_cnpj',
        'Agente': 'agente',
        'Ação': 'acao',
        'Data': 'data',
        'Hora': 'hora',
        'Histórico': 'historico',
        'Fone Discado': 'fone_discado',
        'Credor': 'credor',
        'Atraso': 'atraso',
        'Valor': 'valor',
        'Inclusão': 'inclusao',
        'CDEC': 'cdec'
    }
    
    df.rename(columns=column_mapping, inplace=True)
    
    # Garantir que todas as colunas necessárias existam
    required_columns = list(column_mapping.values())
    for col in required_columns:
        if col not in df.columns:
            df[col] = None
    
    # Converter valores
    df['valor'] = df['valor'].apply(convert_monetary_value)
    df['data'] = df['data'].apply(convert_date)
    df['inclusao'] = df['inclusao'].apply(convert_date)
    df['hora'] = df['hora'].apply(convert_time)
    df['atraso'] = df['atraso'].apply(convert_int)
    
    # Substituir NaN por None para SQL
    df = df.where(pd.notnull(df), None)
    
    return df


def insert_data_batch(connection, df):
    """Insere dados em lote no banco de dados"""
    insert_sql = """
    INSERT INTO vuon_resultados 
    (nome, codigo, cpf_cnpj, agente, acao, data, hora, 
     historico, fone_discado, credor, atraso, valor, inclusao, cdec)
    VALUES 
    (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                    batch_data.append((
                        None if pd.isna(row['nome']) else row['nome'],
                        None if pd.isna(row['codigo']) else row['codigo'],
                        None if pd.isna(row['cpf_cnpj']) else row['cpf_cnpj'],
                        None if pd.isna(row['agente']) else row['agente'],
                        None if pd.isna(row['acao']) else row['acao'],
                        None if pd.isna(row['data']) else row['data'],
                        None if pd.isna(row['hora']) else row['hora'],
                        None if pd.isna(row['historico']) else row['historico'],
                        None if pd.isna(row['fone_discado']) else row['fone_discado'],
                        None if pd.isna(row['credor']) else row['credor'],
                        None if pd.isna(row['atraso']) else row['atraso'],
                        None if pd.isna(row['valor']) else row['valor'],
                        None if pd.isna(row['inclusao']) else row['inclusao'],
                        None if pd.isna(row['cdec']) else row['cdec']
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
    csv_file = find_csv_file(folder_path, folder_date)
    
    if not csv_file:
        raise FileNotFoundError(f"Arquivo CSV não encontrado na pasta {folder_date}")
    
    print(f"  📄 Processando arquivo: {os.path.basename(csv_file)}")
    
    # Ler e processar CSV
    df = read_and_process_csv(csv_file)
    print(f"  📊 Total de registros no CSV: {len(df)}")
    
    # Inserir dados
    inserted, errors = insert_data_batch(connection, df)
    
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
            csv_file = find_csv_file(folder_path, folder_date)
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
    print("🚀 Importador Automatizado VUON - Iniciando...")
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


