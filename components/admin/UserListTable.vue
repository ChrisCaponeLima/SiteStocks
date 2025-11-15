// /components/admin/UserListTable.vue - V3.4 - REFACTOR: Usabilidade da Tabela (Scroll, Ícones e Estilo Intercalado)
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
       <th class="col-actions">Ações</th>
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
        
    </div>     <div v-if="isFormVisible" class="modal-overlay" @click.self="closeForm">
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
 roleId: number
 role: { name: string; level: number }
}

// -----------------------------------------------------------------------------
// 2️⃣ Estados reativos e referências
// -----------------------------------------------------------------------------
const authStore = useAuthStore()
const currentUser = computed(() => authStore.user)
const users = ref<UserDisplay[]>([])
const usersLoaded = ref(false) // 🚀 evita hydration mismatch
const isFormVisible = ref(false)
const selectedUser = ref<UserDisplay | null>(null)

// -----------------------------------------------------------------------------
// 3️⃣ Função principal: busca de usuários via $api (com cookie HTTPOnly)
// -----------------------------------------------------------------------------
const fetchUsers = async () => {
 try {
  console.log('[ADMIN][USERS] Buscando lista de usuários segura via $api...')

  // ✅ Usa o plugin /plugins/03.api.ts — cookie-only, seguro, SSR compatível
  const response = await useNuxtApp().$api('/admin/users', { method: 'GET' })

  // A nova rota retorna { success, users, count }
  if (!response?.success || !Array.isArray(response.users)) {
   console.error('[ADMIN][USERS] Formato de resposta inesperado:', response)
   throw new Error('Formato inválido retornado pela API')
  }

  users.value = response.users
  usersLoaded.value = true
 } catch (error: any) {
  console.error('[ADMIN][USERS] Falha ao carregar usuários:', error)
  alert(error?.data?.statusMessage || 'Erro ao buscar usuários. Verifique permissões.')
 }
}

// -----------------------------------------------------------------------------
// 4️⃣ Ações do formulário/modal
// -----------------------------------------------------------------------------
const openForm = (user: UserDisplay | null) => {
 selectedUser.value = user
 isFormVisible.value = true
}

const closeForm = () => {
 isFormVisible.value = false
 selectedUser.value = null
}

const handleFormSaved = async () => {
 await fetchUsers()
}

// -----------------------------------------------------------------------------
// 5️⃣ Alterar status do usuário (Ativar/Inativar)
// -----------------------------------------------------------------------------
const toggleStatus = async (user: UserDisplay) => {
 const novoStatus = user.ativo ? 'INATIVO' : 'ATIVO'
 if (!confirm(`Deseja realmente ${novoStatus === 'ATIVO' ? 'ativar' : 'inativar'} o usuário ${user.nome}?`)) return

 try {
  const result = await useNuxtApp().$api(`/admin/users/${user.id}/status`, {
   method: 'PUT',
   body: { status: novoStatus },
  })

  if (!result?.success) throw new Error(result?.message || 'Falha ao atualizar status.')
  await fetchUsers()
 } catch (error: any) {
  console.error('[ADMIN][USERS] Erro ao alternar status:', error)
  alert(error?.data?.statusMessage || 'Erro ao alterar o status do usuário.')
 }
}

// -----------------------------------------------------------------------------
// 6️⃣ Inicialização no cliente
// -----------------------------------------------------------------------------
onMounted(async () => {
 await fetchUsers()
})
</script>

<style scoped>
/* -------------------------------------------------------------------------- */
/* 🎨 ESTILOS AJUSTADOS PARA USABILIDADE E PADRÃO              */
/* -------------------------------------------------------------------------- */
.user-management-container { padding: 20px; }
.actions button { margin-bottom: 20px; margin-right: 10px; padding: 10px 15px; cursor: pointer; }

/* ✅ 1. CONTAINER DE ROLAGEM HORIZONTAL */
.table-scroll-wrapper {
    overflow-x: auto;
    width: 100%;
}

/* ✅ 2. AUMENTO DE LARGURA DAS CÉLULAS E IMPEDIR QUEBRA */
table { 
    width: 100%; 
    border-collapse: collapse; 
    /* Força a tabela a ter uma largura mínima, permitindo a rolagem */
    min-width: 1100px; 
}

/* ✅ 3. INTERCALAR CORES DAS LINHAS */
table tbody tr:nth-child(even) {
    background-color: #f9f9f9; /* Linhas pares */
}

th, td { 
    border: 1px solid #ddd; 
    padding: 10px; 
    text-align: left; 
    /* Impede que o conteúdo da célula quebre linha, garantindo a largura total */
    white-space: nowrap; 
}
th { background-color: #f2f2f2; }
.status-active { color: green; font-weight: bold; }
.status-inactive { color: red; font-weight: bold; }


/* ✅ 4. ESTILOS DE ÍCONES (Botões sem legenda) */
.action-icon {
    /* Transforma o botão em um ícone compacto */
    padding: 5px; 
    width: 30px; 
    height: 30px;
    font-size: 1.2em; /* Tamanho do emoji/ícone */
    line-height: 1;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
    /* Removendo a margem direita original do btn-edit */
    margin-right: 5px; 
}

.action-icon:hover:not([disabled]) {
    opacity: 0.8;
}

/* Aplicando as cores de fundo e texto aos novos botões de ícone */
.btn-edit { background-color: #ffc107; color: black; border: none; }
.btn-inactivate { background-color: #dc3545; color: white; border: none; }
.btn-activate { background-color: #28a745; color: white; border: none; }

/* Estilo para ícones desabilitados */
.btn-inactivate:disabled, .btn-activate:disabled, .action-icon[disabled] { 
    background-color: #ccc; 
    cursor: not-allowed; 
}


.modal-overlay {
 position: fixed; top: 0; left: 0;
 width: 100%; height: 100%;
 background: rgba(0, 0, 0, 0.5);
 display: flex; justify-content: center; align-items: center;
 z-index: 1000;
}
.loading-state { padding: 40px; text-align: center; color: #888; font-style: italic; }
</style>