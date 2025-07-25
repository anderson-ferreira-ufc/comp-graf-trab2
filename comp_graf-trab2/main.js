import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GUI } from 'dat.gui';

// 1. CONFIGURAÇÃO BÁSICA (CENA, CÂMERA, RENDERIZADOR, LUZ)

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Fundo cinza escuro

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 35); // Posição da câmera para ver a cena

const renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias suaviza as bordas
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 15, 10);
scene.add(directionalLight);

// 2. MUNDO DA FÍSICA (CANNON.JS)

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0) // Gravidade apontando para baixo
});

// 3. ELEMENTOS DO JOGO (CHÃO, CESTA, BOLINHAS)

let score = 0;
const scoreElement = document.getElementById('score');
const objetosNoMundo = []; // Array para sincronizar objetos visuais e físicos

// --- CHÃO ---
const groundBody = new CANNON.Body({
    mass: 0, // Massa 0 torna o objeto estático (não cai nem se move)
    shape: new CANNON.Plane(),
    type: CANNON.Body.STATIC
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotaciona para ficar deitado
groundBody.position.y = -15;
world.addBody(groundBody);

// Malha visual para o chão
const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -15;
scene.add(groundMesh);

// --- CESTA ---
const cestaGroup = new THREE.Group(); // Agrupa as partes visuais da cesta
scene.add(cestaGroup);
const cestaBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC }); // Kinematic pode ser movido por código mas não é afetado por forças
world.addBody(cestaBody);

// Corpo físico da cesta (composto por 3 caixas)
cestaBody.addShape(new CANNON.Box(new CANNON.Vec3(5, 0.5, 2.5)), new CANNON.Vec3(0, 0, 0)); // Base
cestaBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 2, 2.5)), new CANNON.Vec3(-4.5, 2.5, 0)); // Parede esquerda
cestaBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 2, 2.5)), new CANNON.Vec3(4.5, 2.5, 0)); // Parede direita
cestaBody.position.y = -12;

// Malha visual da cesta (correspondente ao corpo físico)
const cestaMaterial = new THREE.MeshStandardMaterial({ color: 0x0088ff });
const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 5), cestaMaterial);
const parede1Mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 5), cestaMaterial);
parede1Mesh.position.set(-4.5, 2.5, 0);
const parede2Mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 5), cestaMaterial);
parede2Mesh.position.set(4.5, 2.5, 0);
cestaGroup.add(baseMesh, parede1Mesh, parede2Mesh);

// --- GERADOR DE BOLINHAS ---
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.9 });
const ballSpecialMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.1, metalness: 1.0, emissive: 0x333300 }); // Dourada/Especial

function createBall() {
    const radius = 1;
    const isSpecial = Math.random() < 0.1; // 10% de chance de ser especial

    // Objeto Visual (Three.js)
    const ballMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius),
        isSpecial ? ballSpecialMaterial : ballMaterial
    );
    scene.add(ballMesh);

    // Corpo Físico (Cannon.js)
    const ballBody = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3(
            (Math.random() - 0.5) * 40, // Posição X aleatória na largura da "chuva"
            25, // Começa sempre no topo
            0
        )
    });
    world.addBody(ballBody);

    // Adiciona propriedades para a lógica do jogo
    ballBody.isBall = true;
    ballBody.points = isSpecial ? 5 : 1;

    // Adiciona um "ouvinte" de evento de colisão para esta bolinha
    ballBody.addEventListener('collide', (event) => {
        // Se a colisão for com a cesta e a bolinha ainda valer pontos...
        if (event.body === cestaBody && ballBody.points > 0) {
            score += ballBody.points;
            scoreElement.innerText = `Pontos: ${score}`; // Atualiza o placar
            ballBody.points = 0; // Zera os pontos para não contar de novo no mesmo quique
        }
    });

    objetosNoMundo.push({ mesh: ballMesh, body: ballBody });
}

// 4. CONTROLES E INTERATIVIDADE (MOUSE, GUI)

// --- CONTROLE DA CESTA PELO MOUSE ---
window.addEventListener('mousemove', (event) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const vector = new THREE.Vector3(x, 0, 0.5).unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    // Atualiza a posição do corpo físico da cesta, limitando o movimento
    cestaBody.position.x = THREE.MathUtils.clamp(pos.x, -25, 25);
});

// --- PAINEL DE CONTROLE DAT.GUI ---
const gui = new GUI();
const controles = {
    gravidade: -9.82,
    velocidadeBolas: 1 // Bolas por segundo
};

gui.add(controles, 'gravidade', -30, -1, 0.1).name('Gravidade').onChange(valor => {
    world.gravity.y = valor; // Aplica a nova gravidade ao mundo físico
});

gui.add(controles, 'velocidadeBolas', 0.1, 5, 0.1).name('Bolas / seg').onChange(valor => {
    clearInterval(ballTimer); // Para o timer antigo
    const ballInterval = 1000 / valor; // Calcula o novo intervalo
    ballTimer = setInterval(createBall, ballInterval); // Inicia um novo timer com a nova velocidade
});

// 5. LOOP PRINCIPAL DE ANIMAÇÃO

let ballTimer = setInterval(createBall, 1000 / controles.velocidadeBolas);
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // 1. Atualiza o mundo da física
    world.step(1 / 60, clock.getDelta());

    // 2. Sincroniza a posição da cesta (visual e física)
    cestaGroup.position.copy(cestaBody.position);
    cestaGroup.quaternion.copy(cestaBody.quaternion);

    // 3. Sincroniza todas as bolinhas e remove as que saíram da tela
    for (let i = objetosNoMundo.length - 1; i >= 0; i--) {
        const obj = objetosNoMundo[i];
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);

        // Remove a bolinha se ela cair muito para baixo, para otimizar o jogo
        if (obj.body.position.y < -20) {
            world.removeBody(obj.body);
            scene.remove(obj.mesh);
            objetosNoMundo.splice(i, 1);
        }
    }

    // 4. Renderiza a cena na tela
    renderer.render(scene, camera);
}

// --- Ajuste de janela do navegador ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();