# 📱 Gestão de Escalas & Equipe (Android)

Aplicativo mobile desenvolvido para automatizar o planejamento, controle e comunicação de escalas mensais e equipes, eliminando a dependência de anotações manuais e planilhas descentralizadas.

---

### 💡 Problema & Solução
* **Problema:** A elaboração de escalas operacionais com frequência causava retrabalho, desencontro de informações e dificuldade na hora de avisar os membros escalados com antecedência.
* **Solução:** Uma aplicação mobile intuitiva conectada a um banco de dados em nuvem, permitindo distribuição rápida de tarefas, exportação de relatórios formais e lembretes automáticos pré-formatados para disparo via WhatsApp.

---

### 🚀 Funcionalidades Principais
* **Gestão Dinâmica de Escala:** Lançamento rápido de responsáveis por funções e turnos com persistência em tempo real.
* **Sincronização em Nuvem:** Dados centralizados no PostgreSQL via Supabase com segurança de acesso.
* **Exportação em PDF:** Geração instantânea de relatórios formatados em tamanho A4 para impressão ou compartilhamento.
* **Lembretes Automáticos:** Identificação inteligente da data do próximo compromisso e cópia de mensagem personalizada para envio via WhatsApp com um toque.
* **Gestão de Equipe:** Cadastro e visualização de membros organizados por cargos e funções.

---

### 🛠️ Tecnologias Utilizadas
* **Frontend:** React Native (Expo)
* **Backend / Database:** Supabase (PostgreSQL)
* **Bibliotecas:** `expo-print`, `expo-clipboard`, `@supabase/supabase-js`
* **Compilação:** EAS Build (APK standalone para Android)
