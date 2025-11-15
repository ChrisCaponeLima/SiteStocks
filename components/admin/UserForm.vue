// /components/admin/UserForm.vue - V1.8 - FIX: Ajuste final do CSS do modal (flex e min-height) para garantir que o scroll do conteúdo funcione corretamente, mantendo os botões visíveis.
<template>
<div class="user-form-modal">
 <h3>{{ isEditMode ? 'Editar' : 'Adicionar' }} Usuário (ID: {{ form.id ? form.id : 'Novo' }})</h3>
 
 <form @submit.prevent="submitForm">
 <div class="form-content-scroll"> 
  
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

    <div class="form-section" v-if="!isEditMode">
   <h4>Dados Iniciais do Cotista (Obrigatório)</h4>
   
   <div class="form-group">
    <label for="capitalInicial">Capital Inicial (R$):</label>
    <input type="number" id="capitalInicial" v-model.number="form.capitalInicial" required min="0" step="0.01" />
   </div>

   <div class="form-group">
    <label for="aporteMensalPadrao">Aporte Mensal Padrão (R$):</label>
    <input type="number" id="aporteMensalPadrao" v-model.number="form.aporteMensalPadrao" required min="0" step="0.01" />
   </div>
  </div>

  </div>  <div class="form-actions">
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
import { useAuthStore } from '~/stores/auth'; 

interface UserFormProps {
isVisible: boolean;
initialData: any | null;
}
const props = defineProps<UserFormProps>();
const emit = defineEmits(['close', 'saved']);

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
capitalInicial?: number; 
aporteMensalPadrao?: number;
}

const authStore = useAuthStore();
const currentUser = computed(() => authStore.user); 

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
capitalInicial: 0, 
aporteMensalPadrao: 0,
};

const form = ref<UserFormData>({ ...initialForm });

const isEditMode = computed(() => !!props.initialData?.id);
const canChangeRole = computed(() => !isEditMode.value || (currentUser.value && currentUser.value.roleLevel > props.initialData.role.level));


const fetchAvailableRoles = async () => {
try {
 const data = await $fetch('/api/admin/roles'); 
 availableRoles.value = data as typeof availableRoles.value;
} catch (e) {
 console.error('Erro ao carregar roles de acesso:', e);
 alert('Erro ao carregar níveis de acesso. Verifique seu nível de permissão.');
}
};

watch(() => props.initialData, (newVal) => {
if (newVal) {
 form.value = {
 id: newVal.id,
 cpf: newVal.cpf,
 nome: newVal.nome,
 sobrenome: newVal.sobrenome,
 telefone: newVal.telefone || null,
 email: newVal.email,
 password: '', 
 roleId: newVal.roleId,
 ativo: newVal.ativo, 
 };
} else {
 form.value = { ...initialForm };
}
}, { immediate: true });

const submitForm = async () => {
if (isLoading.value) return;

const payload = { ...form.value };
if (isEditMode.value && payload.password === '') {
 delete payload.password;
}

isLoading.value = true;
try {
 if (isEditMode.value) {
 delete payload.capitalInicial;
 delete payload.aporteMensalPadrao;
 
 await $fetch(`/api/admin/users/${payload.id}`, { 
  method: 'PUT', 
  body: payload 
 });
 alert('Usuário atualizado com sucesso!');
 } else {
 // Garante que os valores de Capital e Aporte são numéricos para o backend
 payload.capitalInicial = Number(payload.capitalInicial);
 payload.aporteMensalPadrao = Number(payload.aporteMensalPadrao);
 
 await $fetch('/api/admin/users', { 
  method: 'POST', 
  body: payload 
 });
 alert('Usuário criado com sucesso!');
 }
 
 emit('saved'); 
 emit('close'); 

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
/* 🔑 FIX UI SCROLL: Define o modal com altura máxima e layout flex para que o conteúdo rolável funcione */
.user-form-modal { 
 padding: 20px; 
 border: 1px solid #ddd; 
 border-radius: 8px; 
 background: #fff; 
 max-width: 600px; 
 width: 100%; 
 margin: 0 auto; 
 
 /* FIX: Garante altura máxima na tela */
 max-height: 90vh; 
 display: flex;
 flex-direction: column;
}

form {
 display: flex;
 flex-direction: column;
 flex-grow: 1; 
 /* 🔑 FIX: Adiciona min-height: 0 para evitar que o conteúdo interno force o formulário a ser maior que o container */
 min-height: 0; 
}

/* 🔑 Container para o conteúdo que deve rolar */
.form-content-scroll {
 overflow-y: auto; 
 padding-right: 15px; 
 margin-right: -15px; 
 flex-grow: 1; 
 /* 🔑 FIX: Adiciona min-height: 0 para evitar que o conteúdo interno force o form-content-scroll a ser maior que o container */
 min-height: 0; 
}

.form-section { margin-bottom: 20px; padding: 10px; border: 1px dashed #eee; border-radius: 4px; }
h4 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0; }
.form-group { margin-bottom: 15px; }
label { display: block; margin-bottom: 5px; font-weight: bold; }
input:not([type="checkbox"]), select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
/* Garante que as ações fiquem no final do modal e não sejam roladas */
.form-actions { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; flex-shrink: 0; } 
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