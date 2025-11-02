<template>
    <header class="bg-primary shadow-lg sticky top-0 z-40">
      <div class="container flex justify-between items-center py-4">
        
        <NuxtLink to="/" class="text-2xl font-bold text-secondary tracking-wider hover:text-white transition duration-200">
          SiteStocks
        </NuxtLink>
  
        <nav class="hidden md:flex space-x-6">
          <NuxtLink to="/" class="text-text-light hover:text-secondary font-medium transition duration-200">
            Home (Cida)
          </NuxtLink>
          <NuxtLink to="/simulacao" class="text-text-light hover:text-secondary font-medium transition duration-200">
            Simulador Genérico
          </NuxtLink>
          <NuxtLink to="/login" class="text-text-light hover:text-secondary font-medium transition duration-200">
            Login
          </NuxtLink>
        </nav>
  
        <NuxtLink to="/login" class="hidden md:block btn btn-primary py-2 px-6">
          Área do Investidor
        </NuxtLink>
  
        <button class="md:hidden text-text-light text-2xl">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </header>
  </template>
  
  <script setup lang="ts">
  // Nada de lógica aqui, é um componente puramente de apresentação
  </script>