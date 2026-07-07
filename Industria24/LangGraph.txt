Prompt para o Claude Code:
"Claude, agora que temos a estrutura do LangGraph pronta no coder_graph.py, use o terminal para instalar o framework de testes (ex: pytest). Implemente a lógica real no nó execute_test_node para que ele salve o código gerado em um arquivo temporário e execute o comando pytest de verdade, capturando a saída exata do erro para alimentar o nosso grafo."  


## Diretrizes de Inteligência Artificial / LangChain
- Sempre use a sintaxe moderna LCEL (LangChain Expression Language) com o operador `|` (pipe).
- PROIBIDO usar classes antigas e depreciadas como `LLMChain` ou `Predict`. Use `ChatPromptTemplate` e `.invoke()`.
- Prefira usar pacotes específicos atualizados, como `@langchain/anthropic` ou `langchain-anthropic` em vez do pacote genérico antigo.

python

from typing import TypedDict, List
from langgraph.graph import StateGraph, START, END
from langchain_anthropic import ChatAnthropic

# 1. Defina o Estado do seu Grafo (O caderno de notas compartilhado)
class AgentState(TypedDict):
    task: str                 # O que o usuário pediu para programar
    generated_code: str       # O código atual escrito pela IA
    test_results: str         # O log de erro do terminal (se falhar)
    iterations: int           # Quantas vezes tentou corrigir

# Inicializa o modelo de IA (Recomendado: Claude 3.5 Sonnet)
llm = ChatAnthropic(model="claude-3-5-sonnet-latest", temperature=0)

# 2. Nós (Nodes): Os trabalhadores do fluxo
def generate_code_node(state: AgentState):
    """Nó responsável por escrever ou corrigir o código com base nos erros."""
    print("--- GERANDO / CORRIGINDO CÓDIGO ---")
    prompt = f"Tarefa: {state['task']}\nCódigo anterior: {state['generated_code']}\nErros encontrados: {state['test_results']}"
    # Lógica de chamada ao LLM aqui para retornar o código limpo
    new_code = llm.invoke(prompt).content 
    return {"generated_code": new_code, "iterations": state['iterations'] + 1}

def execute_test_node(state: AgentState):
    """Nó que roda o código localmente (usando subprocess) ou uma ferramenta de teste."""
    print("--- EXECUTANDO TESTES UNITÁRIOS ---")
    # Simulação de execução usando as ferramentas do sistema
    # Se rodar e der erro, você captura a String do erro aqui
    erro_do_terminal = "" 
    return {"test_results": erro_do_terminal}

# 3. Bordas Condicionais (Routing): Decisores do fluxo
def router_decision(state: AgentState):
    """Decide se o código está pronto ou se precisa voltar para correção."""
    if not state["test_results"] or state["iterations"] >= 3:
        return "finish"  # Código perfeito ou estourou o limite de tentativas
    return "reprovar"   # Voltar para o nó de geração para consertar o erro

# 4. Construção do Grafo
workflow = StateGraph(AgentState)

# Adiciona os trabalhadores
workflow.add_node("generator", generate_code_node)
workflow.add_node("tester", execute_test_node)

# Cria as conexões
workflow.add_edge(START, "generator")
workflow.add_edge("generator", "tester")

# Adiciona a decisão condicional saindo do teste
workflow.add_conditional_edges(
    "tester",
    router_decision,
    {
        "finish": END,
        "reprovar": "generator"
    }
)

# Compila o agente
coder_agent = workflow.compile()