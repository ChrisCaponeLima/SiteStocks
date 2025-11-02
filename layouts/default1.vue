<template>
  <div class="app-layout min-h-screen flex flex-col">
    
    <header class="header">
        <div class="container">
            <nav class="flex items-center justify-between py-4">
                <NuxtLink to="/" class="text-2xl font-bold text-primary">Cida Miranda</NuxtLink>
                <div class="hidden md:flex space-x-6">
                    <NuxtLink to="/" class="nav-link">Home</NuxtLink>
                    <NuxtLink to="/simulacao" class="nav-link">Simulador</NuxtLink>
                    <NuxtLink to="/login" class="nav-link btn-secondary-sm">Entrar</NuxtLink>
                </div>
            </nav>
        </div>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-col logo-col">
                    <img src="/images/logo_ts_white.png" alt="Tech Stocks Logo" class="footer-logo">
                    <p>Seu parceiro no mercado de ações.</p>
                </div>
                <div class="footer-col">
                    <h4>Links Úteis</h4>
                    <ul>
                        <li><NuxtLink to="#">Sobre Nós</NuxtLink></li>
                        <li><NuxtLink to="#">Como Funciona</NuxtLink></li>
                        <li><NuxtLink to="#">Blog</NuxtLink></li>
                        <li><NuxtLink to="#">Contato</NuxtLink></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Legal</h4>
                    <ul>
                        <li><NuxtLink to="#">Termos de Uso</NuxtLink></li>
                        <li><NuxtLink to="#">Política de Privacidade</NuxtLink></li>
                        <li><NuxtLink to="#">Aviso de Riscos</NuxtLink></li>
                        <li><NuxtLink to="#">FAQ</NuxtLink></li>
                    </ul>
                </div>
                <div class="footer-col contact-col">
                    <h4>Contato</h4>
                    <p><i class="fas fa-envelope"></i> contato@[suaempresa].com</p>
                    <p><i class="fas fa-phone-alt"></i> (XX) XXXX-XXXX</p>
                    <div class="social-icons">
                        <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin"></i></a>
                        <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                        <a href="#" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 Jaguar Tech Stocks. Todos os direitos reservados. Regulado pelo Banco Central do Brasil e CVM.</p>
                <div class="security-seals">
                    <img src="/images/selo-banco-central.webp" alt="Selo Banco Central" title="Regulado pelo Banco Central do Brasil">
                    <img src="/images/selo-cvm.webp" alt="Selo CVM" title="Regulado pela CVM">
                </div>
            </div>
        </div>
    </footer>
  </div>
</template>

<script setup>
// /layouts/default.vue - V1.2 - Script Setup não alterado.
// Não é necessário Script Setup para um layout simples.
</script>