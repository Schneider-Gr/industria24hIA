-- 0159: `processando` passa a ser um status válido de repasse.
--
-- Bug de producao, caminho do dinheiro. `transferirRepasse` (lib/repasses.ts)
-- faz um claim atomico antes de chamar a Asaas: move a linha de `pendente` para
-- `processando` e so segue se o update devolveu linha, para que duas execucoes
-- concorrentes nao disparem o mesmo PIX duas vezes. Mas o CHECK criado na 0084
-- nunca listou `processando`:
--
--   CHECK (status = ANY (ARRAY['pendente','transferido','falhou','inelegivel','estornado']))
--
-- Entao o claim viola a constraint, o supabase-js devolve o erro em `error` --
-- que o codigo descarta, porque desestrutura apenas `data` -- e a funcao faz
-- `return` silencioso. Resultado: nenhum repasse de seller conseguia sair de
-- `pendente`, e a tabela `repasses` tem zero linhas `transferido` em producao.
-- Confirmado em 04/09/2026 clicando "Solicitar repasse" no pedido B21EC13B43
-- com a loja elegivel e a chave PIX confirmada: a linha continuou `pendente`
-- nas duas tentativas.
--
-- O guard de descarte de erro tambem foi corrigido no app nesta mesma change,
-- para que uma falha futura de claim seja ruidosa em vez de silenciosa.

alter table public.repasses drop constraint if exists repasses_status_check;

alter table public.repasses add constraint repasses_status_check
  check (status = any (array[
    'pendente',
    'processando',
    'transferido',
    'falhou',
    'inelegivel',
    'estornado'
  ]));
