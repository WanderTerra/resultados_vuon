#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script principal para executar todas as automações do VUON
Executa as 3 automações em paralelo usando threads:
- Importação de resultados VUON
- Importação de bordero de pagamento
- Importação de novações
"""

import sys
import threading
import time
from datetime import datetime

# Importar as funções main_loop de cada automação
from import_vuon_automated import main_loop as vuon_main_loop
from import_bordero_automated import main_loop as bordero_main_loop
from import_novacoes_automated import main_loop as novacoes_main_loop


def run_vuon_automation():
    """Executa a automação de resultados VUON"""
    try:
        print("\n" + "=" * 60)
        print("🚀 Iniciando automação: Resultados VUON")
        print("=" * 60)
        vuon_main_loop()
    except Exception as e:
        print(f"\n❌ ERRO na automação Resultados VUON: {str(e)}")
        import traceback
        traceback.print_exc()


def run_bordero_automation():
    """Executa a automação de bordero de pagamento"""
    try:
        print("\n" + "=" * 60)
        print("🚀 Iniciando automação: Bordero de Pagamento")
        print("=" * 60)
        bordero_main_loop()
    except Exception as e:
        print(f"\n❌ ERRO na automação Bordero de Pagamento: {str(e)}")
        import traceback
        traceback.print_exc()


def run_novacoes_automation():
    """Executa a automação de novações"""
    try:
        print("\n" + "=" * 60)
        print("🚀 Iniciando automação: Novações")
        print("=" * 60)
        novacoes_main_loop()
    except Exception as e:
        print(f"\n❌ ERRO na automação Novações: {str(e)}")
        import traceback
        traceback.print_exc()


def main():
    """Função principal que inicia todas as automações em threads separadas"""
    print("=" * 80)
    print("🚀 SISTEMA DE AUTOMAÇÃO VUON - INICIANDO TODAS AS AUTOMAÇÕES")
    print("=" * 80)
    print(f"⏰ Início: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n📋 Automações que serão executadas:")
    print("   1. Resultados VUON (K:\\RPA VUON\\planilhas_por_dia\\)")
    print("   2. Bordero de Pagamento (K:\\RPA VUON\\pagamentos\\)")
    print("   3. Novações (K:\\RPA VUON\\Novações\\)")
    print("\n💡 Cada automação roda em uma thread separada e é independente")
    print("💡 Use Ctrl+C para encerrar todas as automações")
    print("=" * 80)
    
    # Criar threads para cada automação
    thread_vuon = threading.Thread(target=run_vuon_automation, name="VUON-Resultados", daemon=False)
    thread_bordero = threading.Thread(target=run_bordero_automation, name="VUON-Bordero", daemon=False)
    thread_novacoes = threading.Thread(target=run_novacoes_automation, name="VUON-Novacoes", daemon=False)
    
    try:
        # Iniciar todas as threads
        print("\n🔄 Iniciando threads...")
        thread_vuon.start()
        time.sleep(2)  # Pequeno delay para evitar conflitos na inicialização
        
        thread_bordero.start()
        time.sleep(2)
        
        thread_novacoes.start()
        time.sleep(2)
        
        print("\n✅ Todas as automações foram iniciadas!")
        print("📊 Status das threads:")
        print(f"   - Resultados VUON: {'✅ Rodando' if thread_vuon.is_alive() else '❌ Parada'}")
        print(f"   - Bordero Pagamento: {'✅ Rodando' if thread_bordero.is_alive() else '❌ Parada'}")
        print(f"   - Novações: {'✅ Rodando' if thread_novacoes.is_alive() else '❌ Parada'}")
        print("\n⏳ Aguardando execução das automações...")
        print("   (Pressione Ctrl+C para encerrar todas)\n")
        
        # Aguardar todas as threads (bloqueia até que todas terminem)
        thread_vuon.join()
        thread_bordero.join()
        thread_novacoes.join()
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrompido pelo usuário (Ctrl+C)")
        print("🛑 Encerrando todas as automações...")
        
        # Aguardar um pouco para as threads finalizarem
        time.sleep(2)
        
        print("\n📊 Status final das threads:")
        print(f"   - Resultados VUON: {'⏳ Finalizando...' if thread_vuon.is_alive() else '✅ Encerrada'}")
        print(f"   - Bordero Pagamento: {'⏳ Finalizando...' if thread_bordero.is_alive() else '✅ Encerrada'}")
        print(f"   - Novações: {'⏳ Finalizando...' if thread_novacoes.is_alive() else '✅ Encerrada'}")
        
    except Exception as e:
        print(f"\n❌ Erro fatal no sistema principal: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        print("\n" + "=" * 80)
        print("👋 Sistema de automação encerrado")
        print(f"⏰ Fim: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)


if __name__ == '__main__':
    main()

