
# Gestor de Escalas - IASD Bosque

Sistema de gestão de voluntários e escalas inteligente, desenvolvido para otimizar a organização de cultos e eventos da igreja.

## 🛠 Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Vite
- **Estilização:** Tailwind CSS
- **Ícones:** Lucide React
- **Backend (BaaS):** Supabase (PostgreSQL, Auth)
- **Inteligência Artificial:** Google Gemini API (`gemini-2.5-flash`)

## 🚀 Funcionalidades Principais

### 1. Gestão de Voluntários
- Cadastro completo com foto (upload ou webcam).
- Definição de níveis de acesso: **Voluntário**, **Líder** e **Administrador**.
- Atribuição de múltiplos ministérios/funções por pessoa.

### 2. Gestão de Equipes
- Criação de grupos fixos de voluntários (ex: "Equipe de Louvor A").
- Facilita a escalação em bloco.

### 3. Escalas e Eventos (Schedule)
- **Visualização:** Lista cronológica de eventos com cards detalhados.
- **Criação:** Suporte a eventos recorrentes (ex: repetir semanalmente por 3 meses).
- **Tipos de Evento:** Categorias personalizáveis com cores (ex: Culto Jovem, Escola Bíblica).
- **IA Scheduler:** O sistema utiliza o Google Gemini para sugerir escalas automáticas baseadas na disponibilidade e nas funções dos voluntários cadastrados.

### 4. Sistema de RSVP (Confirmação)
- Os voluntários podem confirmar (✅) ou recusar (❌) sua participação.
- **Recusa Obrigatória:** Ao recusar, é exigido um motivo, que fica visível para os líderes.
- **Auditoria:** Todas as ações de RSVP são logadas no sistema.

## 📂 Estrutura do Projeto

- `/src/components`: Componentes visuais (Listas, Cards, Modais).
- `/src/services`: Integração com APIs externas.
    - `db.ts`: Camada de abstração do Supabase.
    - `geminiService.ts`: Integração com a IA do Google.
    - `supabaseClient.ts`: Inicialização do cliente Supabase.
- `/src/types.ts`: Definições de tipos TypeScript globais.

## 🔮 Roadmap & Melhorias Futuras

### 1. Integração com WhatsApp (Automated Notifications)
Atualmente o sistema gera links para envio manual. O objetivo é automatizar:
- **Trigger:** Webhook no Supabase ao criar/alterar escala.
- **Action:** Edge Function dispara mensagem via API do WhatsApp (Meta API ou Z-API).
- **Mensagem:** "Olá {nome}, você foi escalado para {data}. Confirme aqui: {link}".

### 2. Bloqueio de Datas (Unavailability)
- Permitir que voluntários marquem "Férias" ou datas indisponíveis.
- Alimentar essa informação no prompt da IA para evitar conflitos.

### 3. Métricas
- Dashboard para líderes visualizarem engajamento e frequência dos voluntários.

### 4. PWA (Progressive Web App)
- Melhorar o manifesto para permitir instalação nativa em Android/iOS e Push Notifications.
