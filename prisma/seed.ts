// prisma/seed.ts - V3.1 - Inserção de Múltiplos Registros (6) com limpeza de dados para evitar erro P2002
import { PrismaClient, TipoMovimentacao } from '@prisma/client'

// OBSERVAÇÃO DE INTEGRIDADE: 
// Em um sistema real, a senha DEVE ser hasheada aqui. 
// Para fins de SEED e desenvolvimento, usaremos um valor placeholder.
const HASHED_PASSWORD_PLACEHOLDER = 'senha_de_exemplo_123456' 

const prisma = new PrismaClient()

// Função utilitária para criar o Cotista, o User e a Movimentação inicial em uma única transação
async function createCotistaUserAndMovement({
 nomeCompleto,
 cpfBase,
 email,
 capitalInicial,
 numeroDaConta,
 dataMovimentacao,
 fundoId,
}: {
 nomeCompleto: string,
 cpfBase: string,
 email: string,
 capitalInicial: number,
 numeroDaConta: string,
 dataMovimentacao: Date,
 fundoId: number,
}) {
// Separa nome e sobrenome
const partesNome = nomeCompleto.split(' ');
const nome = partesNome[0];
// Trata nomes compostos ou únicos
const sobrenome = partesNome.length > 1 ? partesNome.slice(1).join(' ') : ''; 

// 1. Criar o Cotista (Dados Financeiros/Negócio)
const cotista = await prisma.cotista.create({
 data: {
 numeroDaConta: numeroDaConta, 
 capitalInicial: capitalInicial, 
 aporteMensalPadrao: 500.00, 
 fundoId: fundoId,
 dataCriacao: dataMovimentacao, 
 },
});

// 2. Criar o Usuário (Dados Pessoais/Acesso)
const user = await prisma.user.create({
 data: {
 // Dados de Acesso (Login)
 cpf: cpfBase,
 password: HASHED_PASSWORD_PLACEHOLDER,
 // Dados Pessoais
 nome: nome,
 sobrenome: sobrenome,
 email: email,
 telefone: '(11) 99999-0000', 
 // Relacionamento OBRIGATÓRIO 1:1
 cotistaId: cotista.id, 
 }
});

// 3. Criar a Movimentação Inicial de Aporte
await prisma.movimentacaoCotista.create({
 data: {
 cotistaId: cotista.id,
 dataMovimentacao: dataMovimentacao,
 tipo: TipoMovimentacao.APORTE,
 valor: capitalInicial,
 }
});

console.log(`Registro completo criado: ${nomeCompleto} (Conta: ${numeroDaConta}, User ID: ${user.id})`);
}

async function main() {
console.log('--- Iniciando o Seed do Banco de Dados ---')

// =============================================================
// BLOCO DE LIMPEZA: EXCLUSÃO NA ORDEM CORRETA DEVIDO A CHAVES ESTRANGEIRAS
// Este bloco é crucial para evitar o erro P2002 (Unique Constraint Failed)
console.log('Limpando dados existentes antes do seeding...')
await prisma.movimentacaoCotista.deleteMany({}) 
await prisma.user.deleteMany({})                
await prisma.cotista.deleteMany({})             
await prisma.fundo.deleteMany({})               
console.log('Limpeza concluída.')
// =============================================================

// --- 1. Criar o Fundo de Investimento (Será criado do zero) ---
const fundoCriado = await prisma.fundo.create({
 data: {
 nome: 'Jaguar Alpha Fundo',
 cnpj: '12.345.678/0001-90', 
 taxaAdm: 0.005, 
 dataInicio: new Date('2024-01-01T00:00:00.000Z'),
 },
})
console.log(`Fundo criado com sucesso: ${fundoCriado.nome} (ID: ${fundoCriado.id})`)

// --- 2. Dados dos Cotistas ---
const cotistasData = [
 { 
 nomeCompleto: 'Cida Miranda', 
 cpfBase: '12345678900', 
 email: 'cida.miranda@example.com', 
 capitalInicial: 50000.00, 
 numeroDaConta: 'STOCKS-1001', 
 dataMovimentacao: new Date('2024-08-01T00:00:00.000Z'), // Dia 1
 },
 { 
 nomeCompleto: 'Giovana Lelis', 
 cpfBase: '10020030040', 
 email: 'giovana.lelis@example.com', 
 capitalInicial: 10000.00, 
 	// Padrão de Nomes: CPF, Email, Conta devem ser únicas
 numeroDaConta: 'STOCKS-1002', 
 dataMovimentacao: new Date('2024-08-05T00:00:00.000Z'), // Dia 5
 },
 { 
 nomeCompleto: 'Rafael Gomes', 
 cpfBase: '20030040050', 
 email: 'rafael.gomes@example.com', 
 capitalInicial: 10000.00, 
 numeroDaConta: 'STOCKS-1003', 
 dataMovimentacao: new Date('2024-08-10T00:00:00.000Z'), // Dia 10
 },
 { 
 nomeCompleto: 'Márcia Gomes', 
 cpfBase: '30040050060', 
 email: 'marcia.gomes@example.com', 
 capitalInicial: 100000.00, 
 numeroDaConta: 'STOCKS-1004', 
 dataMovimentacao: new Date('2024-08-15T00:00:00.000Z'), // Dia 15
 },
 { 
 nomeCompleto: 'Alyne Silva', 
 cpfBase: '40050060070', 
 email: 'alyne.silva@example.com', 
 capitalInicial: 60000.00, 
 numeroDaConta: 'STOCKS-1005', 
 dataMovimentacao: new Date('2024-08-20T00:00:00.000Z'), // Dia 20
 },
 { 
 nomeCompleto: 'Jaguar Invest', 
 	// Ajuste do nome para garantir nome e sobrenome
 cpfBase: '50060070080', 
 email: 'jaguar.invest@example.com', 
 capitalInicial: 20000.00, 
 numeroDaConta: 'STOCKS-1006', 
 dataMovimentacao: new Date('2024-08-25T00:00:00.000Z'), // Dia 25
 },
];

// Itera sobre os dados e cria os registros
for (const data of cotistasData) {
 await createCotistaUserAndMovement({
 ...data,
 fundoId: fundoCriado.id,
 });
}
}

main()
.catch((e) => {
 console.error('Erro durante o processo de seeding:')
 console.error(e)
 process.exit(1)
})
.finally(async () => {
 await prisma.$disconnect()
 console.log('--- Seed finalizado ---')
})