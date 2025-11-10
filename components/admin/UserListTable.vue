// /components/admin/UserListTable.vue - V1.1 - Integração do Formulário de Edição/Criação
<template>
  <div class="user-management-container">
    <h2>Manutenção de Usuários (Nível {{ currentUser.roleLevel }})</h2>

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
          <th>Role</th>
          <th>Status</th>
          <th>Data Criação</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.name }} {{ user.sobrenome }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.level }}</td>
          <td>{{ user.role.name }}</td>
          <td>
            <span :class="{'status-active': user.status, 'status-inactive': !user.status}">
              {{ user.status ? 'ATIVO' : 'INATIVO' }}
            </span>
          </td>
          <td>{{ new Date(user.createdAt).toLocaleDateString() }}</td>
          <td>
            <button @click="openForm(user)" class="btn-edit">✏️ Editar</button>
            <button 
              @click="toggleStatus(user)" 
              :disabled="user.id === currentUser.id || user.level >= currentUser.roleLevel"
              :class="user.status ? 'btn-inactivate' : 'btn-activate'"
            >
              {{ user.status ? '❌ Inativar' : '✅ Ativar' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="isFormVisible" class="modal-overlay" @click.self="closeForm">
        <AdminUserForm 
            :isVisible="isFormVisible" 
            :initialData="selectedUser" 
            @close="closeForm" 
            @saved="handleFormSaved" 
        />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '~/stores/auth'; // Importa a Store para o nível de acesso

// Assumindo a estrutura de dados da API de listagem
interface UserDisplay {
    id: number;
    name: string;
    email: string;
    level: number;
    status: boolean; // Ativo/Inativo
    createdAt: string;
    sobrenome: string;
    roleId: number;
    role: { name: string; level: number };
    // Outros campos relevantes para o formulário
}

const authStore = useAuthStore();
const currentUser = computed(() => authStore.user); // Pega dados do usuário logado

const users = ref<UserDisplay[]>([]);
const isFormVisible = ref(false);
const selectedUser = ref<UserDisplay | null>(null);

// Função para buscar a lista de usuários
const fetchUsers = async () => {
  try {
    // 🔑 Requisição para o endpoint seguro
    const data = await $fetch('/api/admin/users'); 
    // Mapeamos a resposta para o frontend, assumindo que 'status' é 'ATIVO' ou 'INATIVO' no DB
    users.value = (data as any[]).map(u => ({
        ...u,
        status: u.status === 'ATIVO', // Converte a string 'ATIVO'/'INATIVO' para boolean
        // name e sobrenome já vêm separados do DB
    })) as UserDisplay[];
  } catch (e) {
    console.error('Falha ao carregar usuários:', e);
    alert('Erro ao carregar a lista de usuários. Verifique sua conexão e permissões.');
  }
};

const openForm = (user: UserDisplay | null) => {
    selectedUser.value = user; // Define o usuário para edição ou null para criação
    isFormVisible.value = true;
};

const closeForm = () => {
    isFormVisible.value = false;
    selectedUser.value = null;
};

const handleFormSaved = () => {
    fetchUsers(); // Atualiza a lista após salvar
};

const toggleStatus = async (user: UserDisplay) => {
    const newStatus = user.status ? 'INATIVO' : 'ATIVO';
    if (!confirm(`Tem certeza que deseja ${newStatus} o usuário ${user.name} ${user.sobrenome}?`)) {
        return;
    }
    
    try {
        await $fetch(`/api/admin/users/${user.id}/status`, {
            method: 'PUT',
            body: { status: newStatus }
        });
        await fetchUsers();
    } catch (e: any) {
        const message = e.data?.statusMessage || 'Erro ao alterar o status do usuário.';
        alert(`Falha: ${message}`);
        console.error('Erro ao alternar status:', e);
    }
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
/* Estilos essenciais para a tabela */
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

/* Modal Overlay */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}
.user-form-modal {
    /* Garante que o formulário fique visível sobre o overlay */
    background: white; 
    padding: 20px;
    border-radius: 8px;
}
</style>