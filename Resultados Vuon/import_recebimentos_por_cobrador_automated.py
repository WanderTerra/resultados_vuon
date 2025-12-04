#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script automatizado para importar dados de recebimentos por cobrador
Processa automaticamente arquivos Excel em K:\\RPA VUON\\recebimento por cobrador\\
Extrai dados relacionando agentes com suas linhas e popula a tabela recebimentos_por_cobrador
"""

import sys
import os
import time
import glob
import re
import pymysql
from sshtunnel import SSHTunnelForwarder
import pandas as pd
from datetime import datetime, date
from dotenv import load_dotenv

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
BASE_PATH = r'K:\RPA VUON\recebimento por cobrador'
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
    """Conecta ao banco de dados através do túnel SSH"""
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
    # Tabela de logs já deve existir, mas vamos garantir
    create_logs_sql = """
    CREATE TABLE IF NOT EXISTS recebimentos_por_cobrador_logs (
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
        cursor.execute(create_logs_sql)
        connection.commit()
        print("✅ Tabela de logs verificada/criada")


def check_already_processed(connection, data_pasta):
    """Verifica se uma pasta já foi processada com sucesso"""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT status FROM recebimentos_por_cobrador_logs WHERE data_pasta = %s",
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
            """INSERT INTO recebimentos_por_cobrador_logs (data_pasta, arquivo_processado, status, tentativas)
               VALUES (%s, %s, 'processando', 1)
               ON DUPLICATE KEY UPDATE 
               status = 'processando', 
               tentativas = tentativas + 1,
               updated_at = CURRENT_TIMESTAMP""",
            (data_pasta, arquivo)
        )
        connection.commit()


def mark_as_success(connection, data_pasta, arquivo, registros_inseridos):
    """Marca uma importação como sucesso"""
    with connection.cursor() as cursor:
        cursor.execute(
            """UPDATE recebimentos_por_cobrador_logs 
               SET status = 'sucesso', 
                   registros_inseridos = %s,
                   updated_at = CURRENT_TIMESTAMP
               WHERE data_pasta = %s AND arquivo_processado = %s""",
            (registros_inseridos, data_pasta, arquivo)
        )
        connection.commit()


def mark_as_error(connection, data_pasta, arquivo, erro_mensagem):
    """Marca uma importação como erro"""
    with connection.cursor() as cursor:
        cursor.execute(
            """UPDATE recebimentos_por_cobrador_logs 
               SET status = 'erro', 
                   erro_mensagem = %s,
                   updated_at = CURRENT_TIMESTAMP
               WHERE data_pasta = %s AND arquivo_processado = %s""",
            (str(erro_mensagem)[:1000], data_pasta, arquivo)
        )
        connection.commit()


def get_folders_to_process():
    """Retorna lista de pastas com formato de data (YYYY-MM-DD) para processar"""
    folders = []
    
    if not os.path.exists(BASE_PATH):
        print(f"⚠️  Caminho base não encontrado: {BASE_PATH}")
        return folders
    
    # Buscar todas as pastas com formato de data
    pattern = re.compile(r'^\d{4}-\d{2}-\d{2}$')
    
    try:
        for item in os.listdir(BASE_PATH):
            item_path = os.path.join(BASE_PATH, item)
            if os.path.isdir(item_path) and pattern.match(item):
                folders.append(item)
        
        # Ordenar por data (mais antigas primeiro)
        folders.sort()
    except Exception as e:
        print(f"❌ Erro ao listar pastas: {e}")
    
    return folders


def find_excel_files(folder_path):
    """Encontra arquivos Excel (.xls ou .xlsx) na pasta"""
    excel_files = []
    
    patterns = ['*.xls', '*.xlsx']
    for pattern in patterns:
        files = glob.glob(os.path.join(folder_path, pattern))
        excel_files.extend(files)
    
    return excel_files


def extract_agent_info(cell_value):
    """Extrai ID e nome do agente de uma célula"""
    if not cell_value:
        return None, None
    
    cell_str = str(cell_value).strip()
    pattern = r'Agente\s+(\d+)\s*[-–]\s*(.+)'
    match = re.search(pattern, cell_str, re.IGNORECASE)
    
    if match:
        agent_id = match.group(1).strip()
        agent_name = match.group(2).strip()
        return agent_id, agent_name
    
    return None, None


def is_totalization_row(nome_cliente):
    """Verifica se uma linha é de totalização e deve ser ignorada"""
    if not nome_cliente or pd.isna(nome_cliente):
        return False
    
    nome_str = str(nome_cliente).strip()
    
    # Padrões de totalização encontrados na planilha
    totalizacao_patterns = [
        r'^-\s*Soma$',
        r'^-\s*Contagem$',
        r'^Total\s+Geral',
        r'^Total\s+',
        r'Total\s+Geral\(.+\)\s*-\s*Soma',
        r'Total\s+Geral\(.+\)\s*-\s*Contagem',
    ]
    
    for pattern in totalizacao_patterns:
        if re.search(pattern, nome_str, re.IGNORECASE):
            return True
    
    return False


def convert_excel_value(value):
    """Converte valores do Excel para tipos seguros (evita problemas com timedelta)"""
    if value is None:
        return None
    
    try:
        # Se for timedelta, converter para None (não é uma data válida)
        from datetime import timedelta
        if isinstance(value, timedelta):
            return None  # Retornar None para timedelta
        
        # Se for datetime, converter para string no formato seguro
        if isinstance(value, datetime):
            # Remover timezone se presente
            if value.tzinfo is not None:
                value = value.replace(tzinfo=None)
            return value.strftime('%Y-%m-%d %H:%M:%S') if value else None
        
        # Se for date, converter para string
        if isinstance(value, date):
            return value.strftime('%Y-%m-%d') if value else None
        
        # Para outros tipos, retornar como está
        return value
    except Exception:
        # Em caso de erro, converter para string
        try:
            return str(value) if value else None
        except:
            return None


def extract_data_from_excel(file_path):
    """Extrai dados do arquivo Excel relacionando agentes com suas linhas"""
    try:
        import win32com.client
        
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        
        workbook = None
        try:
            workbook = excel.Workbooks.Open(os.path.abspath(file_path), ReadOnly=True)
            
            if not workbook:
                raise Exception("Não foi possível abrir o workbook")
            
            # Processar primeira aba
            worksheet = workbook.Worksheets(1)
            used_range = worksheet.UsedRange
            
            if not used_range:
                raise Exception("Range usado não encontrado")
            
            row_count = used_range.Rows.Count
            col_count = used_range.Columns.Count
            
            # Encontrar todos os agentes
            agent_positions = []
            
            for row in range(1, row_count + 1):
                try:
                    first_cell = used_range.Cells(row, 1).Value
                    if first_cell:
                        agent_id, agent_name = extract_agent_info(first_cell)
                        if agent_id and agent_name:
                            # Encontrar próxima linha de agente ou fim do arquivo
                            next_agent_row = row_count + 1
                            for next_row in range(row + 1, row_count + 1):
                                next_cell = used_range.Cells(next_row, 1).Value
                                if next_cell:
                                    next_id, next_name = extract_agent_info(next_cell)
                                    if next_id:
                                        next_agent_row = next_row
                                        break
                            
                            agent_positions.append({
                                'row': row,
                                'id': agent_id,
                                'name': agent_name,
                                'next_row': next_agent_row
                            })
                except:
                    continue
            
            if not agent_positions:
                raise Exception("Nenhum agente encontrado no arquivo")
            
            # Processar cada agente
            all_data = []
            headers = None
            totalizacoes_filtradas = 0
            
            for idx, agent in enumerate(agent_positions):
                agent_row = agent['row']
                agent_id = agent['id']
                agent_name = agent['name']
                next_agent_row = agent['next_row']
                
                # Ler cabeçalho (linha após o agente)
                if agent_row + 1 <= row_count:
                    header_row = []
                    for col in range(1, col_count + 1):
                        try:
                            cell_val = used_range.Cells(agent_row + 1, col).Value
                            header_row.append(str(cell_val) if cell_val else f"Col{col}")
                        except:
                            header_row.append(f"Col{col}")
                    
                    if idx == 0:
                        headers = header_row
                
                # Processar linhas de dados
                data_start_row = agent_row + 2
                data_end_row = next_agent_row - 1
                
                for row in range(data_start_row, data_end_row + 1):
                    try:
                        row_data = []
                        is_empty = True
                        
                        for col in range(1, col_count + 1):
                            try:
                                cell_value = used_range.Cells(row, col).Value
                                # Converter valor do Excel para tipo seguro (evita problemas com timedelta)
                                safe_value = convert_excel_value(cell_value)
                                if safe_value is not None:
                                    row_data.append(safe_value)
                                    if str(safe_value).strip():
                                        is_empty = False
                                else:
                                    row_data.append("")
                            except:
                                row_data.append("")
                        
                        if not is_empty:
                            # Verificar se é linha de totalização (primeira coluna = Nome do Cliente)
                            nome_cliente = row_data[0] if len(row_data) > 0 else None
                            if is_totalization_row(nome_cliente):
                                # Pular linha de totalização
                                totalizacoes_filtradas += 1
                                continue
                            
                            row_dict = {
                                'agente_id': agent_id,
                                'agente_nome': agent_name
                            }
                            
                            if headers:
                                for i, header in enumerate(headers):
                                    if i < len(row_data):
                                        row_dict[header] = row_data[i]
                                    else:
                                        row_dict[header] = ""
                            else:
                                for i, value in enumerate(row_data):
                                    row_dict[f'col_{i+1}'] = value
                            
                            all_data.append(row_dict)
                    except:
                        continue
            
            workbook.Close(SaveChanges=False)
            excel.Quit()
            
            if totalizacoes_filtradas > 0:
                print(f"  ⚠️  {totalizacoes_filtradas} linha(s) de totalização foram filtradas e ignoradas")
            
            if all_data:
                df = pd.DataFrame(all_data)
                return df
            else:
                return None
            
        except Exception as e:
            if workbook:
                try:
                    workbook.Close(SaveChanges=False)
                except:
                    pass
            try:
                excel.Quit()
            except:
                pass
            raise e
            
    except ImportError:
        raise Exception("win32com não está instalado. Instale com: pip install pywin32")
    except Exception as e:
        raise Exception(f"Erro ao extrair dados do Excel: {str(e)}")


def parse_datetime(date_str):
    """Converte string de data para datetime (sem timezone para compatibilidade MySQL)"""
    if pd.isna(date_str) or date_str is None:
        return None
    
    try:
        # Se for timedelta, não é uma data válida (pode vir do Excel como diferença de datas)
        from datetime import timedelta
        if isinstance(date_str, timedelta):
            return None
        
        # Se já for um objeto datetime
        if isinstance(date_str, datetime):
            # Se tiver timezone, converter para naive (sem timezone)
            if date_str.tzinfo is not None:
                return date_str.replace(tzinfo=None)
            return date_str
        
        # Se for string, processar
        if isinstance(date_str, str):
            date_str = date_str.strip()
            
            # Remover timezone offset se presente (ex: +00:00, -03:00)
            date_str = re.sub(r'[+-]\d{2}:\d{2}$', '', date_str)
            date_str = re.sub(r'[+-]\d{4}$', '', date_str)  # Formato +0000
            
            # Tentar diferentes formatos
            formats = [
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d %H:%M:%S.%f',  # Com microsegundos
                '%d/%m/%Y %H:%M:%S',
                '%d/%m/%Y',
                '%Y-%m-%d',
                '%d-%m-%Y',
                '%Y/%m/%d'
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt
                except:
                    continue
            
            # Tentar parsing automático do pandas
            try:
                dt = pd.to_datetime(date_str, errors='coerce')
                # Verificar se é NaT (Not a Time)
                if pd.isna(dt):
                    return None
                if isinstance(dt, pd.Timestamp):
                    dt = dt.to_pydatetime()
                # Verificar se ainda é válido
                if dt is None:
                    return None
                # Remover timezone se presente
                if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                return dt
            except Exception:
                return None
        
        return None
    except Exception as e:
        # Em caso de erro, retornar None
        return None


def parse_decimal(value):
    """Converte valor para decimal"""
    if pd.isna(value) or not value:
        return None
    
    try:
        if isinstance(value, (int, float)):
            return float(value)
        
        value_str = str(value).strip()
        # Remover R$ e espaços
        value_str = value_str.replace('R$', '').replace(' ', '')
        # Substituir vírgula por ponto
        value_str = value_str.replace(',', '.')
        return float(value_str)
    except:
        return None


def truncate_string(value, max_length):
    """Trunca string para o tamanho máximo especificado"""
    if value is None:
        return None
    value_str = str(value).strip()
    if len(value_str) > max_length:
        return value_str[:max_length]
    return value_str


def insert_data_batch(connection, df):
    """Insere dados em lote no banco de dados"""
    insert_sql = """
    INSERT INTO recebimentos_por_cobrador 
    (agente_id, agente_nome, nome_cliente, cpf_cnpj, credor, tipo, 
     titulo_contrato, parcela, data_vencimento, data_pagamento, 
     vcto_real, valor_recebido, dias, atraso_real)
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
                    try:
                        # Mapear colunas do DataFrame para campos do banco com truncamento
                        agente_id = int(row['agente_id']) if pd.notna(row.get('agente_id')) else None
                        agente_nome = truncate_string(row.get('agente_nome'), 50)  # VARCHAR(50)
                        nome_cliente = truncate_string(row.get('Nome'), 100)  # VARCHAR(100)
                        cpf_cnpj = truncate_string(row.get('CPF / CNPJ'), 20)  # VARCHAR(20)
                        credor = truncate_string(row.get('Credor'), 10)  # VARCHAR(10)
                        tipo = truncate_string(row.get('Tipo'), 5)  # VARCHAR(5)
                        titulo_contrato = truncate_string(row.get('Título / Contrato'), 30)  # VARCHAR(30)
                        parcela = parse_decimal(row.get('Parc')) if pd.notna(row.get('Parc')) else None
                        # Converter datas com tratamento de erro robusto
                        try:
                            data_vcto = row.get('Data Vcto')
                            if pd.notna(data_vcto) and data_vcto is not None:
                                data_vencimento = parse_datetime(data_vcto)
                            else:
                                data_vencimento = None
                        except Exception:
                            data_vencimento = None
                        
                        try:
                            data_pgto = row.get('Data Pgto')
                            if pd.notna(data_pgto) and data_pgto is not None:
                                data_pagamento = parse_datetime(data_pgto)
                            else:
                                data_pagamento = None
                        except Exception:
                            data_pagamento = None
                        vcto_real = truncate_string(row.get('Vcto REAL'), 15)  # VARCHAR(15)
                        valor_recebido = parse_decimal(row.get('Valor Recebido')) if pd.notna(row.get('Valor Recebido')) else None
                        # Converter dias e atraso_real com tratamento de erro robusto
                        try:
                            dias_val = row.get('Dias')
                            if pd.notna(dias_val) and dias_val is not None:
                                dias_str = str(dias_val).strip()
                                if dias_str and dias_str.lower() not in ['', 'nan', 'none', 'null']:
                                    dias = int(float(dias_val))
                                else:
                                    dias = None
                            else:
                                dias = None
                        except (ValueError, TypeError):
                            dias = None
                        
                        try:
                            atraso_val = row.get('Atraso REAL')
                            if pd.notna(atraso_val) and atraso_val is not None:
                                atraso_str = str(atraso_val).strip()
                                if atraso_str and atraso_str.lower() not in ['', 'nan', 'none', 'null']:
                                    atraso_real = int(float(atraso_val))
                                else:
                                    atraso_real = None
                            else:
                                atraso_real = None
                        except (ValueError, TypeError):
                            atraso_real = None
                        
                        batch_data.append((
                            agente_id, agente_nome, nome_cliente, cpf_cnpj, credor, tipo,
                            titulo_contrato, parcela, data_vencimento, data_pagamento,
                            vcto_real, valor_recebido, dias, atraso_real
                        ))
                    except Exception as e:
                        errors += 1
                        # Log do erro para debug (apenas primeiro erro de cada tipo)
                        if errors == 1:
                            print(f"  ⚠️  Erro ao processar registro (primeiro erro): {str(e)}")
                            import traceback
                            traceback.print_exc()
                        continue
                
                if batch_data:
                    cursor.executemany(insert_sql, batch_data)
                    connection.commit()
                    inserted += len(batch_data)
                
            except Exception as e:
                errors += len(batch)
                connection.rollback()
                raise e
    
    return inserted, errors


def process_file(connection, file_path, data_pasta):
    """Processa um arquivo Excel específico"""
    arquivo = os.path.basename(file_path)
    
    print(f"  📄 Processando arquivo: {arquivo}")
    
    # Extrair dados do Excel
    df = extract_data_from_excel(file_path)
    
    if df is None or df.empty:
        raise Exception("Nenhum dado extraído do arquivo")
    
    print(f"  📊 Total de registros extraídos: {len(df):,}")
    
    # Inserir dados no banco
    inserted, errors = insert_data_batch(connection, df)
    
    if errors > 0:
        raise Exception(f"Erros ao inserir {errors} registros")
    
    return inserted


def process_folder(connection, folder_date):
    """Processa uma pasta específica"""
    folder_path = os.path.join(BASE_PATH, folder_date)
    
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"Pasta não encontrada: {folder_path}")
    
    excel_files = find_excel_files(folder_path)
    
    if not excel_files:
        raise FileNotFoundError(f"Nenhum arquivo Excel encontrado na pasta {folder_date}")
    
    total_inserted = 0
    
    for excel_file in excel_files:
        arquivo = os.path.basename(excel_file)
        
        # Verificar se já foi processado
        if check_already_processed(connection, folder_date):
            print(f"  ⏭️  Pasta já processada: {folder_date}")
            continue
        
        # Marcar como processando
        mark_as_processing(connection, folder_date, arquivo)
        
        try:
            inserted = process_file(connection, excel_file, folder_date)
            total_inserted += inserted
            
            # Marcar como sucesso
            mark_as_success(connection, folder_date, arquivo, inserted)
            
            print(f"  ✅ Arquivo processado com sucesso: {inserted:,} registros")
            
        except Exception as e:
            # Marcar como erro
            mark_as_error(connection, folder_date, arquivo, str(e))
            print(f"  ❌ Erro ao processar arquivo: {e}")
            raise e
    
    return total_inserted


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
        print(f"\n  🔄 Processando pasta: {folder_date}")
        
        try:
            inserted = process_folder(connection, folder_date)
            processed += 1
            print(f"  ✅ Pasta processada: {inserted:,} registros inseridos")
            
        except FileNotFoundError as e:
            skipped += 1
            print(f"  ⏭️  {e}")
        except Exception as e:
            errors += 1
            print(f"  ❌ Erro ao processar pasta {folder_date}: {e}")
            continue
    
    print(f"\n  📊 Resumo: {processed} processadas, {skipped} puladas, {errors} erros")


def main_loop():
    """Loop principal de execução contínua"""
    tunnel = None
    connection = None
    
    print("=" * 60)
    print("🚀 Importador Automatizado - Recebimentos por Cobrador")
    print("=" * 60)
    print(f"📂 Caminho base: {BASE_PATH}")
    print(f"⏱️  Intervalo de verificação: {CHECK_INTERVAL} segundos ({CHECK_INTERVAL/60:.1f} minutos)")
    print(f"💾 Banco de dados: {DB_NAME}")
    print("=" * 60)
    
    try:
        while True:
            try:
                print("\n🔐 Estabelecendo túnel SSH...")
                tunnel = create_ssh_tunnel()
                print(f"✅ Túnel SSH estabelecido (porta local: {tunnel.local_bind_port})")
                
                print("💾 Conectando ao MariaDB...")
                connection = connect_to_db(tunnel)
                print("✅ Conectado ao MariaDB")
                
                print("📋 Criando/verificando tabelas...")
                create_tables(connection)
                print("✅ Tabelas verificadas")
                
                print("\n" + "=" * 60)
                print(f"🔄 Ciclo #{1} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print("=" * 60)
                
                process_all_folders(connection)
                
                print("\n⏳ Aguardando 300 segundos até a próxima verificação...")
                
            except KeyboardInterrupt:
                print("\n\n⚠️  Interrompido pelo usuário")
                break
            except Exception as e:
                print(f"\n❌ Erro no ciclo: {e}")
                import traceback
                traceback.print_exc()
            finally:
                if connection:
                    connection.close()
                    connection = None
                if tunnel:
                    tunnel.stop()
                    tunnel = None
            
            time.sleep(CHECK_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrompido pelo usuário")
    finally:
        if connection:
            connection.close()
            print("🔌 Conexão fechada")
        if tunnel:
            tunnel.stop()
            print("🔐 Túnel SSH fechado")
        print("\n👋 Sistema encerrado")


if __name__ == "__main__":
    main_loop()
