#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script temporário para analisar linhas de totalização na planilha
"""

import os
import re
import win32com.client

def extract_agent_info(cell_value):
    """Extrai informações do agente de uma célula"""
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

# Caminho da planilha
file_path = r'K:\RPA VUON\recebimento por cobrador\2025-12-02\grelat06 (2).xls'

if not os.path.exists(file_path):
    print(f"❌ Arquivo não encontrado: {file_path}")
    exit(1)

print("🔍 Analisando planilha para identificar linhas de totalização...\n")

excel = win32com.client.Dispatch("Excel.Application")
excel.Visible = False
excel.DisplayAlerts = False

workbook = None
try:
    workbook = excel.Workbooks.Open(os.path.abspath(file_path), ReadOnly=True)
    worksheet = workbook.Worksheets(1)
    used_range = worksheet.UsedRange
    
    row_count = used_range.Rows.Count
    col_count = used_range.Columns.Count
    
    print(f"Total de linhas: {row_count}")
    print(f"Total de colunas: {col_count}\n")
    
    # Padrões para identificar linhas de totalização
    totalizacao_patterns = [
        r'Total\s+Geral',
        r'Total\s+',
        r'-?\s*Contagem',
        r'-?\s*Soma',
        r'^Total$',
        r'^Total\s+',
    ]
    
    totalizacoes_encontradas = []
    
    # Encontrar todos os agentes primeiro
    agent_positions = []
    for row in range(1, row_count + 1):
        try:
            first_cell = used_range.Cells(row, 1).Value
            if first_cell:
                cell_str = str(first_cell).strip()
                pattern = r'Agente\s+(\d+)\s*[-–]\s*(.+)'
                match = re.search(pattern, cell_str, re.IGNORECASE)
                if match:
                    agent_id = match.group(1).strip()
                    agent_name = match.group(2).strip()
                    
                    # Encontrar próxima linha de agente
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
    
    print(f"Agentes encontrados: {len(agent_positions)}\n")
    
    # Analisar cada bloco de agente
    for idx, agent in enumerate(agent_positions):
        agent_row = agent['row']
        agent_id = agent['id']
        agent_name = agent['name']
        next_agent_row = agent['next_row']
        
        # Linha de cabeçalho (após o agente)
        header_row = agent_row + 1
        
        # Linhas de dados começam após o cabeçalho
        data_start_row = agent_row + 2
        data_end_row = next_agent_row - 1
        
        print(f"\n{'='*80}")
        print(f"Agente {agent_id} - {agent_name}")
        print(f"Linha do agente: {agent_row}")
        print(f"Linha do cabeçalho: {header_row}")
        print(f"Linhas de dados: {data_start_row} até {data_end_row}")
        print(f"{'='*80}")
        
        # Verificar linhas de dados
        for row in range(data_start_row, data_end_row + 1):
            try:
                # Ler primeira coluna (Nome do Cliente)
                nome_cell = used_range.Cells(row, 1).Value
                if nome_cell:
                    nome_str = str(nome_cell).strip()
                    
                    # Verificar se é linha de totalização
                    is_totalizacao = False
                    matched_pattern = None
                    
                    for pattern in totalizacao_patterns:
                        if re.search(pattern, nome_str, re.IGNORECASE):
                            is_totalizacao = True
                            matched_pattern = pattern
                            break
                    
                    if is_totalizacao:
                        # Ler todas as colunas desta linha
                        row_data = []
                        for col in range(1, min(col_count + 1, 15)):  # Ler até coluna M
                            try:
                                cell_value = used_range.Cells(row, col).Value
                                row_data.append(str(cell_value) if cell_value else "")
                            except:
                                row_data.append("")
                        
                        totalizacoes_encontradas.append({
                            'agente_id': agent_id,
                            'agente_nome': agent_name,
                            'linha': row,
                            'nome_cliente': nome_str,
                            'padrao': matched_pattern,
                            'dados': row_data
                        })
                        
                        print(f"\n⚠️  LINHA DE TOTALIZAÇÃO ENCONTRADA:")
                        print(f"   Linha: {row}")
                        print(f"   Agente: {agent_id} - {agent_name}")
                        print(f"   Padrão: {matched_pattern}")
                        print(f"   Conteúdo da linha:")
                        for i, val in enumerate(row_data[:10], 1):  # Mostrar primeiras 10 colunas
                            if val:
                                print(f"      Col{i}: {val}")
            except Exception as e:
                continue
    
    print(f"\n\n{'='*80}")
    print(f"RESUMO: {len(totalizacoes_encontradas)} linhas de totalização encontradas")
    print(f"{'='*80}\n")
    
    # Agrupar por tipo
    tipos_totalizacao = {}
    for tot in totalizacoes_encontradas:
        nome = tot['nome_cliente']
        if nome not in tipos_totalizacao:
            tipos_totalizacao[nome] = []
        tipos_totalizacao[nome].append(tot)
    
    print("Tipos de totalização encontrados:")
    for tipo, ocorrencias in tipos_totalizacao.items():
        print(f"\n  '{tipo}': {len(ocorrencias)} ocorrência(s)")
        for occ in ocorrencias[:3]:  # Mostrar até 3 exemplos
            print(f"    - Agente {occ['agente_id']} ({occ['agente_nome']}), linha {occ['linha']}")
        if len(ocorrencias) > 3:
            print(f"    ... e mais {len(ocorrencias) - 3} ocorrência(s)")
    
    workbook.Close(SaveChanges=False)
    excel.Quit()
    
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
    if workbook:
        try:
            workbook.Close(SaveChanges=False)
        except:
            pass
    try:
        excel.Quit()
    except:
        pass

