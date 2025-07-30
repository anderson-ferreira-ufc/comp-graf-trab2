import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GUI } from 'dat.gui';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


// 1. CONFIGURAÇÃO BÁSICA (CENA, CÂMERA, RENDERIZADOR, LUZ)

// Cor do céu para o fundo e a névoa
const corDoCeu = 0x4A7A8C; // Um tom de azul acinzentado para o fim de tarde

const scene = new THREE.Scene();
scene.background = new THREE.Color(corDoCeu);
scene.fog = new THREE.Fog(corDoCeu, 30, 150); // A névoa agora combina com o céu

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 35);

// --- SETUP DE ÁUDIO ---
const listener = new THREE.AudioListener();
camera.add(listener);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

let isPaused = false;

const activeParticles = []; // Array para guardar as partículas da explosão

// Luz Hemisférica: Simula a luz do céu (azulada) e a luz rebatida do chão (amarronzada)
const hemisphereLight = new THREE.HemisphereLight(corDoCeu, 0x444422, 1.0);
scene.add(hemisphereLight);

// Luz Direcional: O nosso "sol" de fim de tarde, agora um pouco mais forte
const directionalLight = new THREE.DirectionalLight(0xffd580, 2.5); // Cor quente e intensidade maior
directionalLight.position.set(-30, 25, 20); // Posição mais angulada para sombras longas
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const audioLoader = new THREE.AudioLoader();

const pontoSound = new THREE.Audio(listener);
const groundSound = new THREE.Audio(listener);
const backgroundSound = new THREE.Audio(listener);



audioLoader.load('sounds/pontoSound.wav', function(buffer) {
    pontoSound.setBuffer(buffer);
    pontoSound.setLoop(false); // Garante que o som não repita
    pontoSound.setVolume(0.1);   // Define o volume (de 0 a 1)
});

audioLoader.load('sounds/groundSound.wav', function(buffer) {
    groundSound.setBuffer(buffer);
    groundSound.setLoop(false); // Garante que o som não repita
    groundSound.setVolume(0.1);   // Define o volume (de 0 a 1)
});

audioLoader.load('sounds/music.mp3', function(buffer) {
    backgroundSound.setBuffer(buffer);
    backgroundSound.setLoop(true);
    backgroundSound.setVolume(0.5);   // Define o volume (de 0 a 1)

    backgroundSound.play();
});

// Lista dos modelos que compõem o seu cenário
const sceneParts = [
    'modelo3D/arvore.glb'
];

// Cria uma "promessa" de carregamento para cada modelo
const loadPromises = sceneParts.map(path => {
    return new Promise((resolve, reject) => {
        loader.load(path, gltf => resolve(gltf), undefined, reject);
    });
});

// Promise.all espera que todas as promessas sejam resolvidas
Promise.all(loadPromises).then(loadedModels => {
    // Agora, você pode adicionar cada parte à cena
    const arvore = loadedModels[0].scene;
    const escala = 250;

    // Percorre todos os objetos dentro do modelo da árvore
    arvore.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true; // Cada parte da árvore projetará sombra
            child.receiveShadow = true;
        }
    });

    // Ajuste a posição, rotação e escala de cada parte individualmente
    arvore.scale.set(escala, escala, escala);
    arvore.rotation.x = (-15 * Math.PI) / 180;
    arvore.position.set(-2, -18, -13);
    scene.add(arvore);

    const cloneFixa1 = arvore.clone();
    cloneFixa1.scale.set(escala - 20, escala - 20, escala - 20);
    cloneFixa1.rotation.y = (15 * Math.PI) / 180;
    cloneFixa1.position.set(-42, -12, 11);

    const cloneFixa2 = arvore.clone();
    cloneFixa2.scale.set(escala - 20, escala - 20, escala - 20);
    cloneFixa2.rotation.y = (15 * Math.PI) / 180;
    cloneFixa2.position.set(42, -12, 11);

    scene.add(cloneFixa1);
    scene.add(cloneFixa2);

    const numeroDeArvores = 17; // Defina quantas árvores extras você quer
    for (let i = 0; i < numeroDeArvores; i++) {
        const cloneDaArvore = arvore.clone(); // Cria uma cópia exata

        // Define posições aleatórias para os clones
        const x = (Math.random() - 0.5) * 200; // Posição X entre -100 e 100
        const z = (Math.random() * -100) - 15; // Posição Z sempre atrás da árvore principal
        cloneDaArvore.position.set(x, -18, z);

        // Adiciona variação na rotação e escala para um look mais natural
        cloneDaArvore.rotation.y = Math.random() * Math.PI * 2; // Rotação aleatória
        cloneDaArvore.scale.set(escala, escala, escala);

        scene.add(cloneDaArvore); // Adiciona o clone à cena
    }


}).catch(error => {
    console.error("Erro ao carregar um ou mais modelos", error);
});

// 2. MUNDO DA FÍSICA (CANNON.JS)

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0) // Gravidade apontando para baixo
});

// 3. ELEMENTOS DO JOGO (CHÃO, CESTA, BOLINHAS)
let targetCestaX = 0;
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
    new THREE.PlaneGeometry(450, 300),
    new THREE.MeshStandardMaterial({ color: 0x006400 })
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -15;
groundMesh.receiveShadow = true;
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
const texturaCesta = textureLoader.load('images/cestaTextura.jpg');
const cestaMaterial = new THREE.MeshStandardMaterial({ map: texturaCesta });
const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 5), cestaMaterial);
const parede1Mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 5), cestaMaterial);
parede1Mesh.position.set(-4.5, 2.5, 0);
const parede2Mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 5), cestaMaterial);
parede2Mesh.position.set(4.5, 2.5, 0);
cestaGroup.castShadow = true;
cestaGroup.add(baseMesh, parede1Mesh, parede2Mesh);

// --- GERADOR DE BOLINHAS ---
const texturaBola = textureLoader.load('images/bolaTextura.jpg');
const ballMaterial = new THREE.MeshStandardMaterial({ map: texturaBola, color: 0xce2c1c, roughness: 0.1, metalness: 0.9 });
const ballSpecialMaterial = new THREE.MeshStandardMaterial({ map: texturaBola, color: 0xe8e864, roughness: 0.1, metalness: 1.0, emissive: 0x333300 });// Dourada/Especial
const ballGlassesMaterial = new THREE.MeshStandardMaterial({
    map: texturaBola,
    color: 0x88CCEE,      // ou 0xA0E7E5, 0xC0F0F2
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.5         // ajuste entre 0.1 e 0.5 para mais ou menos “vidro”
  });
   // Glasses

function createBall() {
    const radius = 1;
    const segments = 5;
    const isSpecial = Math.random() < 0.1; // 10% de chance de ser especial
    const isGlasses = Math.random() < 0.25; // 50% de chance de ser uma bola de vidro
    // Objeto Visual (Three.js)
    const ballMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, segments, segments),
        isSpecial ? ballSpecialMaterial : isGlasses ? ballGlassesMaterial : ballMaterial
    );
    ballMesh.castShadow = true;
    // Cria o caule
    const stemGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
    const stemMat  = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const stemMesh = new THREE.Mesh(stemGeom, stemMat);
    // posiciona o caule no topo da esfera
    stemMesh.position.set(0, radius + 0.2, 0);
    stemMesh.castShadow = true;
     // Cria a folha e anexa ao caule
     const leafGeom = new THREE.PlaneGeometry(0.3, 1);
     const leafMat  = new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide });
     const leafMesh = new THREE.Mesh(leafGeom, leafMat);
     // inclina e posiciona a folha sobre o caule
     leafMesh.rotation.set(Math.PI / 4, 0, 0);
     leafMesh.position.set(0.15, 0.15, 0);
     stemMesh.add(leafMesh);
     ballMesh.add(stemMesh);
    scene.add(ballMesh);

    // Corpo Físico (Cannon.js)
    const ballBody = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3(
            (Math.random() - 0.5) * 40, // Posição X aleatória na largura da "chuva"
            25, // Começa sempre no topo
            0
        ),

        ccdSpeedThreshold: 5,
        // Número de iterações do CCD para aumentar a precisão.
        ccdIterations: 5
    });
    world.addBody(ballBody);

    // Adiciona propriedades para a lógica do jogo
    ballBody.isBall = true;
    ballBody.points = isSpecial ? 5 : 1;
    ballBody.isGlasses = isGlasses;

    // Adiciona um "ouvinte" de evento de colisão para esta bolinha
    ballBody.addEventListener('collide', (event) => {
        // Não queremos múltiplos timers para a mesma bolinha
        if (ballBody.hasBeenHandled) return;

        const contactTarget = event.body;
        const ballObject = objetosNoMundo.find(obj => obj.body === ballBody);

        if (contactTarget === cestaBody) {
            // --- COLISÃO COM A CESTA ---
            ballBody.hasBeenHandled = true; // Marca a bolinha para não processar de novo

            if (ballBody.points > 0) {
                score += ballBody.points;
                scoreElement.innerText = `Pontos: ${score}`;
                ballBody.points = 0;

                // Efeito sonoro ao ganhar ponto
                if (pontoSound.isPlaying) pontoSound.stop();
                pontoSound.play();
            }
            createExplosion(ballBody.position, ballObject.mesh.material.color);
            // Inicia o efeito de desintegração após 2 segundos
            setTimeout(() => {
                removeBall(ballObject);
            }, 3500); // 2 segundos

        } else if (contactTarget === groundBody) {
            // --- COLISÃO COM O CHÃO ---
            ballBody.hasBeenHandled = true; // Marca a bolinha

            // Se for bola de vidro, perde 1 ponto
            if (ballBody.isGlasses) {
                score -= 1;
                scoreElement.innerText = `Pontos: ${score}`;
            }
            // Inicia o efeito de desintegração após 5 segundos
            setTimeout(() => {
                removeBall(ballObject);
            }, 4000); // 5 segundos

            if (groundSound.isPlaying) groundSound.stop();
            groundSound.play();
        }
    });

    objetosNoMundo.push({ mesh: ballMesh, body: ballBody });
};

function createExplosion(position, color) {
    const particleCount = 20;
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true
    });

    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial.clone());
        particleMesh.position.copy(position);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15
        );

        activeParticles.push({
            mesh: particleMesh,
            velocity: velocity,
            lifetime: Math.random() * 0.5 + 0.5 // Vida entre 0.5 e 1.0 segundos
        });
        scene.add(particleMesh);
    }
}

function removeBall(ballObject) {
    if (ballObject && ballObject.body) {
        world.removeBody(ballObject.body);
        scene.remove(ballObject.mesh);
        objetosNoMundo.splice(objetosNoMundo.indexOf(ballObject), 1);
    }
};

// 4. CONTROLES E INTERATIVIDADE (MOUSE, GUI)

// --- CONTROLE DA CESTA PELO MOUSE ---
window.addEventListener('mousemove', (event) => {   

    // Libera o audio para ser tocado no navegador
    if (listener.context.state === 'suspended') {
        listener.context.resume();
    };
       
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const vector = new THREE.Vector3(x, 0, 0.5).unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    // Atualiza a posição do corpo físico da cesta, limitando o movimento
    targetCestaX = THREE.MathUtils.clamp(pos.x, -25, 25);
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

    const deltaTime = clock.getDelta();

    // Calcula a diferença entre a posição alvo (do mouse) e a posição atual da cesta
    const distanciaX = targetCestaX - cestaBody.position.x;
    // --- LÓGICA DE PAUSE ---
    // Se o jogo NÃO estiver pausado, atualiza tudo
    if (!isPaused) {
        // Define uma velocidade proporcional à distância. O '10' é um fator de "força".
        // Quanto maior o número, mais rápido a cesta seguirá o mouse.
        const distanciaX = targetCestaX - cestaBody.position.x;
        // Aplica a velocidade ao corpo físico da cesta
        const velocidadeX = distanciaX * 10;
        cestaBody.velocity.x = velocidadeX;
        // 1. Atualiza o mundo da física
        world.step(1 / 60, deltaTime, 10);
        // 2. Sincroniza a posição da cesta (visual e física)
        cestaGroup.position.copy(cestaBody.position);
        cestaGroup.quaternion.copy(cestaBody.quaternion);
        // 3. Sincroniza todas as bolinhas e remove as que saíram da tela
        for (let i = objetosNoMundo.length - 1; i >= 0; i--) {
            const obj = objetosNoMundo[i];
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);

            // Remove a bolinha se ela cair muito para baixo, para otimizar o jogo
            /*if (obj.body.position.y < -20 && !obj.removeTimer) {
                // Bolinha caiu no chão e ainda não tem um timer
                obj.removeTimer = setTimeout(() => {
                    // Função para remover a bolinha (criaremos abaixo)
                    fadeAndRemoveBall(obj);
                }, 2000); // 5000 milissegundos = 5 segundos
            }*/

            // Remove a bolinha imediatamente se ela estiver MUITO abaixo (segurança)
            if (obj.body.position.y < -100) {
                removeBall(obj);
                objetosNoMundo.splice(i, 1);
            }
        }
    }
    // 4. Renderiza a cena na tela
    renderer.render(scene, camera);

    // --- Atualiza e remove partículas de explosão ---
    for (let i = activeParticles.length - 1; i >= 0; i--) {
        const particle = activeParticles[i];
        particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
        particle.lifetime -= deltaTime;
        if (particle.lifetime <= 0) {
            scene.remove(particle.mesh);
            activeParticles.splice(i, 1);
        }
    }
}

const pauseScreen = document.getElementById('pauseScreen');
const guiContainer = gui.domElement;
guiContainer.style.display = 'none'; // Esconde o GUI por padrão

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.style.display = 'block';
        guiContainer.style.display = 'block'; // Mostra o GUI no pause
        clearInterval(ballTimer); // Para de criar bolas
        document.body.style.cursor = 'default'; // cursor aparece para facilitar

        if (backgroundSound.isPlaying) {
            backgroundSound.pause();
        }

    } else {
        pauseScreen.style.display = 'none';
        guiContainer.style.display = 'none'; // Esconde o GUI
        const ballInterval = 1000 / controles.velocidadeBolas;
        ballTimer = setInterval(createBall, ballInterval); // Volta a criar bolas
        document.body.style.cursor = 'none'; //cursor desaparece

        if (!backgroundSound.isPlaying && listener.context.state === 'running') {
            backgroundSound.play();
        }

    }
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'p' || event.key === 'P') {
        togglePause();
    }
});

// --- Ajuste de janela do navegador ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
document.body.style.cursor = 'none';
animate();
