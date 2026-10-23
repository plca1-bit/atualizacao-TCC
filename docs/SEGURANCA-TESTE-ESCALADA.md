# Teste de segurança — escalada de privilégio (admin)

**Teste pedido no relatório:** um usuário comum consegue criar o próprio documento com `role: "admin"`?

**Resultado antes da correção:** SIM — a regra `allow create` de `users` só exigia `request.auth.uid == userId`, sem olhar o conteúdo.

**Correção (arquivo `firestore.rules`):** o documento só pode ser criado com `role` `person` ou `ong`, `blocked == false`, `verified == false`, pessoa já aprovada e ONG sempre pendente (`approved == false`, `status == "pending"`). Além disso, `verified` e os campos de verificação de CNPJ passaram a ser protegidos contra edição pelo próprio usuário, e uma doação só pode ser criada com `trackingStatus == "Em andamento"`.

## Como repetir o teste (em uma cópia/ambiente de teste)
1. Publique as novas regras: Console Firebase › Firestore › Regras › colar o conteúdo de `firestore.rules` › Publicar (ou `firebase deploy --only firestore:rules`).
2. Crie uma conta nova **diretamente pelo Firebase Authentication** (sem passar pelo cadastro do site) e, no console do navegador, execute o `setDoc` do relatório com `role: "admin"`.
3. **Esperado:** erro `Missing or insufficient permissions`. Tente também `role: "person"` com `approved: true` (deve funcionar) e `role: "ong"` com `approved: true` (deve falhar).
4. Para a conta já existente, tente `updateDoc` mudando `role` para `admin`: também deve falhar.

> Observação honesta: a leitura de `users` ainda é liberada a qualquer usuário logado (necessária para listar ONGs). A melhoria recomendada é a coleção `public_profiles`.
