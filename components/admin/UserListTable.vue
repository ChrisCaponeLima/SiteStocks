// /components/admin/UserListTable.vue - V3.3 - REFATORAÇÃO COMPLETA: Adaptação ao padrão JWT Cookie-only + SSR Safe + Guia para Devs
<template>
  <!--
    ✅ A renderização condicional (`v-if="usersLoaded"`) impede erros de hidratação
    no SSR, garantindo que o HTML gerado no servidor seja idêntico ao do cliente.
  -->
  <div class="user-management-container" v-if="usersLoaded">
    <h2>Manutenção de Usuários (Nível {{ currentUser?.roleLevel || '...' }})</h2>

    <div class="actions">
      <button @click="openForm(null)">➕ Novo Usuário</button>
      <button @click="fetchUsers">🔄 Atualizar Lista</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nome Completo</th>
          <th>E-mail</th>
          <th>Nível</th>
          <th>Função</th>
          <th>Status</th>
          <th>Data Criação</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <!-- ✅ v-for seguro: só renderiza após carregamento completo -->
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.nome }} {{ user.sobrenome }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.level }}</td>
          <td>{{ user.role.name }}</td>
          <td>
            <span :class="{'status-active': user.ativo, 'status-inactive': !user.ativo}">
              {{ user.ativo ? 'ATIVO' : 'INATIVO' }}
            </span>
          </td>
          <td>
            <!-- Campo opcional: se não vier do banco, exibimos “—” -->
            {{ user.dataCriacao ? new Date(user.dataCriacao).toLocaleDateString('pt-BR') : '—' }}
          </td>
          <td>
            <button @click="openForm(user)" class="btn-edit">✏️ Editar</button>
            <button
              @click="toggleStatus(user)"
              :disabled="user.id === currentUser?.id || user.level >= currentUser?.roleLevel"
              :class="user.ativo ? 'btn-inactivate' : 'btn-activate'"
            >
              {{ user.ativo ? '❌ Inativar' : '✅ Ativar' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Modal de formulário (edição/criação) -->
    <div v-if="isFormVisible" class="modal-overlay" @click.self="closeForm">
      <AdminUserForm
        :isVisible="isFormVisible"
        :initialData="selectedUser"
        @close="closeForm"
        @saved="handleFormSaved"
      />
    </div>
  </div>

  <!-- Placeholder de carregamento inicial -->
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
    const response = await useNuxtApp().$api('/api/admin/users', { method: 'GET' })

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
    const result = await useNuxtApp().$api(`/api/admin/users/${user.id}/status`, {
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
/* 🎨 ESTILOS BÁSICOS — Padrão administrativo limpo e responsivo              */
/* -------------------------------------------------------------------------- */
.user-management-container { padding: 20px; }
.actions button { margin-bottom: 20px; margin-right: 10px; padding: 10px 15px; cursor: pointer; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
th { background-color: #f2f2f2; }
.status-active { color: green; font-weight: bold; }
.status-inactive { color: red; font-weight: bold; }
.btn-edit { background-color: #ffc107; color: black; border: none; padding: 5px 10px; cursor: pointer; margin-right: 5px; }
.btn-inactivate { background-color: #dc3545; color: white; border: none; padding: 5px 10px; cursor: pointer; }
.btn-activate { background-color: #28a745; color: white; border: none; padding: 5px 10px; cursor: pointer; }
.btn-inactivate:disabled, .btn-activate:disabled { background-color: #ccc; cursor: not-allowed; }

.modal-overlay {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
}
.loading-state { padding: 40px; text-align: center; color: #888; font-style: italic; }
</style>

<!-- -------------------------------------------------------------------------
🧭 GUIA PARA DESENVOLVEDORES — PADRÃO DE INTEGRAÇÃO COM API SEGURA (JWT COOKIE)
-------------------------------------------------------------------------------
🔐 PADRÃO DE ACESSO
- Todas as requisições usam `useNuxtApp().$api()` (plugin 03.api.ts).
- O token JWT é enviado automaticamente via Cookie HTTPOnly.
- Não usar headers Authorization no front-end.

🧩 PADRÃO DE RESPOSTA
- A API deve retornar objetos estruturados: { success, message?, users?, ... }
- O componente deve verificar se `Array.isArray(response.users)` antes de mapear.

⚙️ PADRÃO SSR
- Sempre use `v-if="usersLoaded"` para evitar erros de hidratação.
- Evite referenciar `authStore.user` diretamente em interpolação SSR antes do mount.

🧱 PADRÃO DE ERROS
- 401 → Cookie ausente / sessão expirada → redirecionar para login.
- 403 → Permissão insuficiente (nível baixo).
- 500 → Erro interno ou falha no Prisma.

📘 REPLICAÇÃO
- Seguir este padrão em todos os componentes administrativos (Admin*, Config*, Relatórios*, etc.).
----------------------------------------------------------------------------- -->
