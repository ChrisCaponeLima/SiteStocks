// /components/admin/UserListTable.vue - V3.5 - FEATURE: Adiciona a coluna 'Último Login'
<template>
 <div class="user-management-container" v-if="usersLoaded">
 <h2>Manutenção de Usuários (Nível {{ currentUser?.roleLevel || '...' }})</h2>

 <div class="actions">
 <button @click="openForm(null)">➕ Novo Usuário</button>
 <button @click="fetchUsers">🔄 Atualizar Lista</button>
 </div>

  <div class="table-scroll-wrapper">
  
    <table>
  <thead>
   <tr>
   <th class="col-id">ID</th>
   <th class="col-name">Nome Completo</th>
   <th class="col-email">E-mail</th>
   <th class="col-level">Nível</th>
   <th class="col-role">Função</th>
   <th class="col-status">Status</th>
   <th class="col-creation-date">Data Criação</th>
        <th class="col-last-login">Último Login</th>    <th class="col-actions">Ações</th>
   </tr>
  </thead>
  <tbody>
      <tr v-for="user in users" :key="user.id">
   <td class="col-id">{{ user.id }}</td>
   <td class="col-name">{{ user.nome }} {{ user.sobrenome }}</td>
   <td class="col-email">{{ user.email }}</td>
   <td class="col-level">{{ user.level }}</td>
   <td class="col-role">{{ user.role.name }}</td>
   <td class="col-status">
    <span :class="{'status-active': user.ativo, 'status-inactive': !user.ativo}">
    {{ user.ativo ? 'ATIVO' : 'INATIVO' }}
    </span>
   </td>
   <td class="col-creation-date">
        {{ user.dataCriacao ? new Date(user.dataCriacao).toLocaleDateString('pt-BR') : '—' }}
   </td>
        <td class="col-last-login"> {{ user.ultimoAcesso ? new Date(user.ultimoAcesso).toLocaleDateString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca' }}
        </td>
   <td class="col-actions">
            <button 
          @click="openForm(user)" 
          class="btn-edit action-icon" 
          title="Editar Usuário"
        >
          ✏️
        </button>
    <button
    @click="toggleStatus(user)"
    :disabled="user.id === currentUser?.id || user.level >= currentUser?.roleLevel"
    :class="['action-icon', user.ativo ? 'btn-inactivate' : 'btn-activate']"
         :title="user.ativo ? 'Inativar Usuário' : 'Ativar Usuário'"
    >
    {{ user.ativo ? '❌' : '✅' }}
    </button>
   </td>
  </tr>
  </tbody>
  </table>
    
  </div>   <div v-if="isFormVisible" class="modal-overlay" @click.self="closeForm">
 <AdminUserForm
  :isVisible="isFormVisible"
  :initialData="selectedUser"
  @close="closeForm"
  @saved="handleFormSaved"
 />
 </div>
</div>

 <div v-else class="loading-state">
 <p>Carregando usuários...</p>
</div>
</template>

<script setup lang="ts">
// -----------------------------------------------------------------------------
// 🔒 UserListTable.vue — SEGURANÇA TOTAL E PADRÃO COOKIE-ONLY
// -----------------------------------------------------------------------------
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

// -----------------------------------------------------------------------------
// 1️⃣ Tipagem do modelo retornado pela API
// -----------------------------------------------------------------------------
interface UserDisplay {
id: number
nome: string
sobrenome: string
email: string
level: number
ativo: boolean
dataCriacao?: string
  ultimoAcesso?: string | null // 🔑 NOVO CAMPO: Corresponde ao ultimoAcesso no Prisma
roleId: number
role: { name: string; level: number }
}

// -----------------------------------------------------------------------------
// 2️⃣ Estados reativos e referências
// ... (restante do script)

// -----------------------------------------------------------------------------
// 6️⃣ Inicialização no cliente
// -----------------------------------------------------------------------------
onMounted(async () => {
await fetchUsers()
})
</script>

<style scoped>
/* -------------------------------------------------------------------------- */
/* 🎨 ESTILOS AJUSTADOS PARA USABILIDADE E PADRÃO       */
/* -------------------------------------------------------------------------- */
/* ... (restante do estilo) */

/* ✅ 2. AUMENTO DE LARGURA DAS CÉLULAS E IMPEDIR QUEBRA */
table { 
  width: 100%; 
  border-collapse: collapse; 
  /* Aumenta a largura mínima da tabela para acomodar a nova coluna */
  min-width: 1250px; 
}

/* ... (restante do estilo) */

/* Estilos específicos para a nova coluna (opcional) */
.col-last-login { 
    width: 120px; 
    font-size: 0.9em; /* Formato de data e hora costuma ser menor */
}
</style>