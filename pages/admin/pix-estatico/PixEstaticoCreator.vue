// /pages/admin/pix-estatico/PixEstaticoCreator.vue - V1.8 - CORREÇÃO DEFINITIVA: Substitui uso de useNuxtApp().$fetch(), que está indisponível no projeto, por importação direta do $fetch via ofetch.

<template>
  <Header pageTitle="Gerenciar Área Pix " />
  <div class="pix-creator-page">
    <h2>➕ Adicionar Novo Código PIX Estático (Nível 2)</h2>
    <p class="description">
      Insira códigos PIX estáticos, pré-homologados, para que os clientes de Nível 0 os utilizem em depósitos.
    </p>

    <form @submit.prevent="submitCode" class="pix-form">
      
      <div class="form-group">
        <label for="pixCode">Código PIX (Copia e Cola):</label>
        <textarea
          id="pixCode"
          v-model="formData.codigo"
          rows="5"
          required
          placeholder="Ex: 00020126550014br.gov.bcb.pix0125..."
        ></textarea>
        <small>Certifique-se de que este código foi gerado pelo seu PSP e é válido. O valor será sempre **nulo** para ser definido pelo cliente.</small>
      </div>

      <button type="submit" :disabled="loading" class="submit-button">
        {{ loading ? 'Salvando...' : 'Salvar Novo Código' }}
      </button>

      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { $fetch } from 'ofetch';
import { definePageMeta } from '#imports';

definePageMeta({
  middleware: ['auth-admin']
});

const formData = reactive({
  codigo: ''
});

const loading = ref(false);
const message = ref(null);
const messageType = ref('');

const submitCode = async () => {
  if (formData.codigo.length < 50) {
    message.value = 'O código PIX deve ser completo e ter no mínimo 50 caracteres.';
    messageType.value = 'error';
    return;
  }

  loading.value = true;
  message.value = null;

  const authStore = useAuthStore();
  await authStore.init();

  const token = authStore.token;

  if (!token) {
    message.value = "ERRO de Autorização (401): Token de sessão não encontrado. Recarregue a página e faça login novamente.";
    messageType.value = 'error';
    loading.value = false;
    return;
  }

  try {
    const response = await $fetch('/api/pix-estatico/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        codigo: formData.codigo
      }
    });

    message.value = response.message;
    messageType.value = 'success';
    formData.codigo = '';

  } catch (e) {
    console.error('API Call Error:', e);

    const status = e?.response?.status;
    const isAuthError = status === 401 || status === 403;

    if (isAuthError) {
      const msg =
        status === 403
          ? 'Nível de permissão insuficiente (Requerido: Nível 2).'
          : 'Sessão expirada. Tente fazer login novamente.';
      message.value = `Falha: ${msg}`;
    } else {
      const errorMsg = e?.data?.statusMessage || 'Erro desconhecido ao adicionar o código.';
      message.value = `Falha: ${errorMsg}`;
    }

    messageType.value = 'error';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.pix-creator-page {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.description {
  color: #7f8c8d;
  margin-bottom: 30px;
  font-size: 0.9em;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #34495e;
}

textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  box-sizing: border-box;
  resize: vertical;
  font-family: monospace;
}

small {
  display: block;
  margin-top: 5px;
  color: #95a5a6;
  font-size: 0.8em;
}

.submit-button {
  width: 100%;
  padding: 12px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-button:hover:not(:disabled) {
  background-color: #27ae60;
}

.submit-button:disabled {
  background-color: #a9d4b4;
  cursor: not-allowed;
}

.message {
  margin-top: 20px;
  padding: 15px;
  border-radius: 4px;
  font-weight: bold;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
