// =====================================================================
// CONFIGURAÇÕES INICIAIS
// =====================================================================
const TOTAL_VAGAS = 45;
let vagas = [];

// Elementos do DOM (que estão no index.html)
const gridVagas = document.getElementById('grid-vagas');
const elTotal = document.getElementById('total-vagas');
const elOcupadas = document.getElementById('vagas-ocupadas');
const elLivres = document.getElementById('vagas-livres');
const elRelogio = document.getElementById('relogio');

// =====================================================================
// FUNÇÕES DE INTERFACE (VISUAL)
// =====================================================================

// 1. Inicializar array de vagas
function inicializarVagas() {
    for (let i = 1; i <= TOTAL_VAGAS; i++) {
        vagas.push({
            id: `A${i}`,
            status: 'livre', // começa tudo como 'livre'
            tempo: '0m'
        });
    }
    renderizarMapa();
    atualizarResumo();
}

// 2. Renderizar vagas no HTML
function renderizarMapa() {
    if (!gridVagas) return; // Segurança caso a div não exista

    gridVagas.innerHTML = ''; // Limpa o mapa atual

    vagas.forEach(vaga => {
        const divVaga = document.createElement('div');
        // Define as classes CSS com base no status ('livre' ou 'ocupada')
        divVaga.className = `vaga ${vaga.status}`;
        divVaga.id = `vaga-${vaga.id}`;

        // Lógica para mostrar o tempo apenas se a vaga estiver ocupada
        let tempoHtml = vaga.status === 'ocupada' ? `<div class="tempo-ocupado">${vaga.tempo}</div>` : '';

        divVaga.innerHTML = `
            <span>Vaga ${vaga.id}</span>
            <span class="material-icons">directions_car</span>
            ${tempoHtml}
        `;
        
        gridVagas.appendChild(divVaga);
    });
}

// 3. Atualizar contadores do topo do Dashboard
function atualizarResumo() {
    const ocupadas = vagas.filter(v => v.status === 'ocupada').length;
    const livres = TOTAL_VAGAS - ocupadas;

    if (elTotal) elTotal.innerText = TOTAL_VAGAS;
    if (elOcupadas) elOcupadas.innerText = ocupadas;
    if (elLivres) elLivres.innerText = livres;
}

// 4. Atualizar relógio no cabeçalho
function atualizarRelogio() {
    if (!elRelogio) return;
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const data = agora.toLocaleDateString('pt-BR');
    elRelogio.innerText = `${data} - ${hora}`;
}

// Faz o relógio atualizar a cada 1 segundo
setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// =====================================================================
// CONEXÃO COM MQTT (WebSockets) - COMUNICAÇÃO COM O ESP32
// =====================================================================

// URL do Broker público EMQX usando WebSocket (porta 8083)
const brokerUrl = 'ws://broker.emqx.io:8083/mqtt';
const topico = 'unifeob/estacionamento/vagas';

console.log("Iniciando conexão com o MQTT...");

// Inicia a conexão
const client = mqtt.connect(brokerUrl);

// Evento: Quando conectar com sucesso ao servidor MQTT
client.on('connect', () => {
    console.log('Conectado ao Broker MQTT com sucesso!');
    
    // Inscreve-se na "sala" (tópico) para escutar o ESP32
    client.subscribe(topico, (err) => {
        if (!err) {
            console.log(`Inscrito no tópico: ${topico}`);
        } else {
            console.error("Erro ao se inscrever no tópico", err);
        }
    });
});

// Evento: Toda vez que chegar uma mensagem do ESP32
client.on('message', (topic, message) => {
    try {
        // A mensagem chega codificada. Transformamos em texto e depois em Objeto (JSON)
        const dados = JSON.parse(message.toString());
        console.log("Mensagem recebida do hardware:", dados);

        // Procura no nosso array a vaga que o ESP32 enviou (ex: "A1")
        const vagaIndex = vagas.findIndex(v => v.id === dados.id);
        
        if (vagaIndex !== -1) {
            // Atualiza os dados da vaga
            vagas[vagaIndex].status = dados.status;
            vagas[vagaIndex].tempo = dados.status === 'ocupada' ? 'Agora' : '0m';
            
            // Refaz o mapa e atualiza o placar para o usuário ver
            renderizarMapa();
            atualizarResumo();
        }
    } catch (error) {
        console.error("Erro ao ler a mensagem do ESP32:", error);
    }
});

// Evento: Se der erro na conexão com a internet ou o Broker
client.on('error', (error) => {
    console.error("Erro na conexão MQTT:", error);
});

// =====================================================================
// INICIAR O SISTEMA AO CARREGAR A PÁGINA
// =====================================================================
inicializarVagas();