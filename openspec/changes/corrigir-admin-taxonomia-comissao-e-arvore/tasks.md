## 1. Diagnóstico

- [x] 1.1 Reproduzir no browser: salvar percentual não grava (confirmado no banco)
- [x] 1.2 Confirmar políticas de `taxonomia_nos` (só SELECT)
- [x] 1.3 Verificar exibição da árvore em produção (raízes e filhos carregam)

## 2. Correção

- [x] 2.1 Update do percentual via service role com checagem de linhas afetadas
- [x] 2.2 Herdado exibido a partir do efetivo do pai
- [x] 2.3 Nome do nó com aparência de link

## 3. Validação

- [x] 3.1 `tsc --noEmit` e lint escopado
- [ ] 3.2 Após deploy: salvar um percentual, ver "próprio" no nó e o valor herdado nos filhos, voltar para vazio
