// /components/admin/UserForm.vue - V1.3 - FIX: Adicionado width: 100% ao modal para garantir expansão até o max-width.
<template>
  <div class="user-form-modal">
    <h3>{{ isEditMode ? 'Editar' : 'Adicionar' }} Usuário (ID: {{ form.id ? form.id : 'Novo' }})</h3>
    
    <form @submit.prevent="submitForm">
      <div class="form-section">
        <h4>Dados Pessoais</h4>
        <div class="form-group">
          <label for="nome">Nome:</label>
          <input type="text" id="nome" v-model="form.nome" required />
        </div>
        
        <div class="form-group">
          <label for="sobrenome">Sobrenome:</label>
          <input type="text" id="sobrenome" v-model="form.sobrenome" required />
        </div>

        <div class="form-group">
          <label for="email">E-mail (Login):</label>
          <input type="email" id="email" v-model="form.email" required :disabled="isEditMode" />
          <small v-if="isEditMode">O e-mail não pode ser alterado no modo de edição.</small>
        </div>

        <div class="form-group">
          <label for="cpf">CPF:</label>
          <input type="text" id="cpf" v-model="form.cpf" required maxlength="14" /> 
        </div>

        <div class="form-group">
          <label for="telefone">Telefone:</label>
          <input type="text" id="telefone" v-model="form.telefone" />
        </div>
      </div>

      <div class="form-section">
        <h4>Permissões e Segurança</h4>
        
        <div class="form-group">
          <label for="roleId">Nível de Acesso:</label>
          <select id="roleId" v-model="form.roleId" required :disabled="!canChangeRole">
            <option disabled :value="null">Selecione um nível</option>
            <option v-for="role in availableRoles" :key="role.id" :value="role.id">
              {{ role.name }} (Nível {{ role.level }})
            </option>
          </select>
          <small v-if="!canChangeRole">Você só pode gerenciar usuários de nível inferior ao seu.</small>
        </div>

        <div class="form-group">
          <label for="password">Senha: <span v-if="!isEditMode">*</span></label>
          <input 
            type="password" 
            id="password" 
            v-model="form.password" 
            :required="!isEditMode" 
          />
          <small v-if="isEditMode">Deixe em branco para manter a senha atual.</small>
        </div>
        
        <div class="form-group" v-if="isEditMode">
          <label>Status:</label>
          <label class="switch">
            <input type="checkbox" v-model="form.ativo" :disabled="form.id === currentUser.id">
            <span class="slider round"></span>
          </label>
          <span class="status-label">{{ form.ativo ? 'ATIVO' : 'INATIVO' }}</span>
          <small v-if="form.id === currentUser.id">Você não pode inativar a sua própria conta.</small>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" :disabled="isLoading">
          {{ isEditMode ? '💾 Salvar Alterações' : '➕ Criar Usuário' }}
        </button>
        <button type="button" @click="emit('close')" :disabled="isLoading">Cancelar</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth'; // Importa a Store para verificar o nível

// 🛑 Padrão de Nomenclatura e Props
interface UserFormProps {
  isVisible: boolean;
  initialData: any | null;
}
const props = defineProps<UserFormProps>();
const emit = defineEmits(['close', 'saved']);

// Tipagem básica para os dados do formulário (compatível com o modelo User do Prisma)
interface UserFormData {
  id?: number;
  cpf: string;
  nome: string;
  sobrenome: string;
  telefone: string | null;
  email: string;
  password?: string;
  roleId: number | null;
  ativo?: boolean;
}

const authStore = useAuthStore();
const currentUser = computed(() => authStore.user); // Pega dados do usuário logado

const isLoading = ref(false);
const availableRoles = ref<{ id: number; name: string; level: number }[]>([]);

const initialForm: UserFormData = {
  cpf: '',
  nome: '',
  sobrenome: '',
  telefone: null,
  email: '',
  password: '',
  roleId: null,
  ativo: true,
};

const form = ref<UserFormData>({ ...initialForm });

const isEditMode = computed(() => !!props.initialData?.id);
// Verifica se o usuário logado tem nível suficiente para mudar a role (mesma regra do backend)
const canChangeRole = computed(() => !isEditMode.value || (currentUser.value && currentUser.value.roleLevel > props.initialData.role.level));


// 🔑 Função para buscar as roles de acesso permitidas
const fetchAvailableRoles = async () => {
  try {
    // Busca roles que o usuário logado PODE criar (nível inferior)
    const data = await $fetch('/api/admin/roles'); 
    availableRoles.value = data as typeof availableRoles.value;
  } catch (e) {
    console.error('Erro ao carregar roles de acesso:', e);
    alert('Erro ao carregar níveis de acesso. Verifique seu nível de permissão.');
  }
};

// 🔑 Watcher para preencher o formulário no modo edição
watch(() => props.initialData, (newVal) => {
  if (newVal) {
    // Preenche o formulário para edição
    form.value = {
      id: newVal.id,
      cpf: newVal.cpf,
      nome: newVal.nome,
      sobrenome: newVal.sobrenome,
      telefone: newVal.telefone || null,
      email: newVal.email,
      password: '', // Senha sempre vazia na edição
      roleId: newVal.roleId,
      ativo: newVal.ativo, // Pega o status atual
    };
  } else {
    // Reseta o formulário para criação
    form.value = { ...initialForm };
  }
}, { immediate: true });

const submitForm = async () => {
  if (isLoading.value) return;

  // 🛑 Limpa a senha se estiver no modo edição e o campo estiver vazio
  const payload = { ...form.value };
  if (isEditMode.value && payload.password === '') {
    delete payload.password;
  }

  isLoading.value = true;
  try {
    if (isEditMode.value) {
      // 🔑 Edição (PUT)
      await $fetch(`/api/admin/users/${payload.id}`, { 
        method: 'PUT', 
        body: payload 
      });
      alert('Usuário atualizado com sucesso!');
    } else {
      // 🔑 Criação (POST)
      await $fetch('/api/admin/users', { 
        method: 'POST', 
        body: payload 
      });
      alert('Usuário criado com sucesso!');
    }
    
    emit('saved'); // Sinaliza que a lista deve ser atualizada
    emit('close'); // Fecha o modal/formulário

  } catch (e: any) {
    const message = e.data?.statusMessage || 'Erro desconhecido ao processar o usuário.';
    alert(`Falha: ${message}`);
    console.error('Erro na submissão do formulário:', e);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchAvailableRoles();
});
</script>

<style scoped>
/* Adicione estilos padronizados aqui */
/* ✅ Ajuste: Adicionado width: 100% para ocupar o espaço disponível antes do max-width */
.user-form-modal { 
    padding: 20px; 
    border: 1px solid #ddd; 
    border-radius: 8px; 
    background: #fff; 
    max-width: 600px; 
    width: 100%; /* <--- AJUSTE APLICADO AQUI */
    margin: 0 auto; 
}
.form-section { margin-bottom: 20px; padding: 10px; border: 1px dashed #eee; border-radius: 4px; }
h4 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0; }
.form-group { margin-bottom: 15px; }
label { display: block; margin-bottom: 5px; font-weight: bold; }
input:not([type="checkbox"]), select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
.form-actions button { margin-right: 10px; padding: 10px 15px; cursor: pointer; border: none; border-radius: 4px; }
.form-actions button:first-child { background-color: #007bff; color: white; }
.form-actions button:disabled { background-color: #ccc; cursor: not-allowed; }

/* Estilos para o Switch de Status (exclusão lógica) */
.switch { position: relative; display: inline-block; width: 60px; height: 34px; margin: 0 10px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: #2196F3; }
input:checked + .slider:before { transform: translateX(26px); }
.status-label { display: inline-block; margin-top: 5px; font-weight: bold; color: #555; }
</style>