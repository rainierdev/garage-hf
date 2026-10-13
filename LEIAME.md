# Site Garage HF Estética

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Site para os clientes (serviços, antes/depois, agendamento) |
| `admin.html` | Painel do dono (também tem o link "Área do dono" no rodapé do site) |
| `js/config.js` | Configuração inicial e chave do Firebase |
| `js/cars.js` | Lista de marcas e modelos de veículos |
| `img/` | Logo, fotos e vídeos |
| `firestore.rules` | Regras de segurança do banco de dados online |

## Como funciona

1. O cliente escolhe um ou mais serviços, o veículo (cerca de 250 modelos, com busca) e um dia e horário.
2. A grade mostra os horários **livres**, os **ocupados** e os **indisponíveis**. Um horário fica indisponível quando já passou, quando o dono o bloqueou ou quando o serviço não cabe antes do fechamento.
3. Ao confirmar, o horário fica reservado e o WhatsApp abre com a mensagem pronta para o número da estética.
4. O preço muda conforme o porte do veículo: hatch, sedã, SUV ou picape (acréscimo em % configurável).

> O WhatsApp não permite que um site envie mensagens sozinho. O site abre o WhatsApp do cliente com o texto pronto, e o cliente só toca em "enviar". Mesmo que ele não envie, o agendamento já aparece no painel.

## Painel do dono

- **Agendamentos**: lista com filtros e busca. Ações: concluir, cancelar (o horário volta a ficar livre), remover, lembrar o cliente pelo WhatsApp e ver o faturamento previsto do mês.
- **Folgas e feriados**: clique num dia do calendário para fechar o dia inteiro ou só alguns horários. Também dá para marcar os feriados nacionais com um clique.
- **Horários**: dias da semana em que abre, horário de abertura e fechamento, intervalo entre horários, quantos carros são atendidos ao mesmo tempo e antecedência mínima.
- **Serviços e preços**: altere nome, preço, duração e descrição, ative ou desative serviços, crie novos e ajuste o acréscimo por porte.
- **Configurações**: WhatsApp, Instagram, endereço, senha e cópia de segurança.

---

## ⚠️ Modo demonstração x modo online

Do jeito que está (`firebase: null` em `js/config.js`), o site funciona em **modo demonstração**: os agendamentos ficam salvos **só no navegador de quem usa**. Isso serve para testar, mas **não serve para clientes reais**, porque o dono não veria os agendamentos feitos em outros celulares.

Senha do painel no modo demonstração: **1234**.

### Ativar o modo online (grátis, cerca de 15 minutos)

1. Acesse https://console.firebase.google.com e crie um projeto (ex.: `garage-hf`).
2. **Firestore Database**: clique em *Criar banco de dados*, escolha a região `southamerica-east1 (São Paulo)` e o modo de produção.
3. **Authentication**: clique em *Vamos começar*, ative *E-mail/senha* e, na aba *Usuários*, adicione o e-mail e a senha do dono.
4. **Firestore, aba Regras**: cole o conteúdo de `firestore.rules`, troque `EMAIL_DO_DONO@gmail.com` pelo e-mail do passo 3 e publique.
5. **Configurações do projeto** (engrenagem), em *Seus apps*, clique no ícone `</>`, registre o app e copie o objeto `firebaseConfig`.
6. Em `js/config.js`, troque `firebase: null` pelo objeto copiado (há um exemplo no arquivo).
7. Entre no painel com o e-mail e a senha do passo 3 e clique em **Salvar** em cada aba, para gravar os serviços e horários no banco.

### Colocar o site no ar (grátis)

- **Netlify**: acesse https://app.netlify.com/drop e arraste a pasta inteira do site. Pronto.
- Ou use **GitHub Pages**, ou **Firebase Hosting** (`firebase deploy`).

Depois, adicione o domínio do site em Firebase, *Authentication*, *Configurações*, *Domínios autorizados*.

## Testar no computador

Basta abrir `index.html` no navegador. Se os vídeos ou as fotos não carregarem, sirva a pasta com um servidor local (por exemplo, a extensão *Live Server* do VS Code).
