Claude, preciso que você crie a arquitetura e o código para um sistema de RAG (Retrieval-Augmented Generation) acoplado ao Supabase. Esse sistema será a base de conhecimento de um CRM Inteligente. O objetivo é ler múltiplos formatos de arquivos, extrair o texto, gerar embeddings e salvá-los no Supabase usando a extensão pgvector.

Por favor, crie a seguinte estrutura de arquivos e lógica no projeto:

1. SCRIPTS SQL (Para rodar no Supabase):
- Crie um arquivo `setup.sql` para habilitar a extensão 'vector'.
- Crie uma tabela chamada 'crm_conhecimento' com os campos: id (uuid), conteudo (text), metadados (jsonb - para guardar a origem como 'whatsapp', 'planilha', etc), e embedding (vector(1536)).
- Crie uma função RPC chamada 'match_crm_conhecimento' para fazer a busca por similaridade de cosseno.

2. PIPELINE DE PROCESSAMENTO (Python ou Node.js, escolha o que for mais robusto para as extensões):
Crie um script ou módulo capaz de abrir a pasta './uploads' e processar:
- Arquivos .ZIP: Extrair os arquivos internos e processá-los individualmente.
- Arquivos de Áudio (.mp3, .wav, .m4a): Simular ou estruturar uma chamada para uma API de transcrição (como Whisper) para transformar o áudio em texto antes de processar.
- Conversas de WhatsApp (.txt ou .json): Ler o histórico de chat e quebrar em blocos lógicos por contexto/data.
- Planilhas (.csv ou .xlsx): Transformar as linhas e colunas em descrições textuais lógicas (Ex: "Cliente X tem o status Y e comprou Z").

3. GERADOR DE EMBEDDINGS E CHUNKING:
- Crie uma lógica de 'chunking' inteligente para quebrar textos longos em pedaços de aproximadamente 1000 caracteres com overlap de 200.
- Integre com uma API de Embedding (como OpenAI text-embedding-3-small de 1536 dimensões ou equivalente) para gerar os vetores.
- Faça o upload em massa (bulk insert) para o Supabase para otimizar a performance.

4. MOTOR DE BUSCA (A query do RAG):
- Crie uma função chamada 'buscar_contexto_crm(query_texto)' que transforme a dúvida do usuário em vetor, consulte o Supabase via RPC e retorne os 5 fragmentos mais relevantes junto com seus metadados.

Por favor, comece criando a estrutura de arquivos e me guie em como rodar o script SQL no painel do Supabase.