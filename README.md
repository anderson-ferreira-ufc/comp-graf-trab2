# comp-graf-trab2

## Apple Rain - Descrição do projeto 

Apple Rain é um jogo 3D em que o objetivo é pegar as maçãs que estão caindo da árvore com uma cesta movida pelo mouse. A cada maçã coletada, os pontos do jogador vão aumentando. No jogo existem maçãs normais e as douradas que dão pontuação maior. O jogo foi desenvolvido utilizando as bibliotecas Three.js para renderização gráfica e Cannon.js para simulação física.  
 
A ambientação do jogo consiste em um cenário de floresta, trilha sonora e feedback sonoro de pontuação. O jogo também oferece a funcionalidade de pausa e um painel de controle (dat.gui) que permite ao jogador ajustar parâmetros como a gravidade e a frequência de surgimento das maçãs, adaptando a dificuldade conforme preferência.

## Como Rodar 

### Pré-requisitos
Navegador com suporte a módulos ES6 (ex.: Chrome, Firefox, Edge)

Servidor local para servir arquivos via HTTP ( Live Server no VS Code, http-server do Node.js, ou Python HTTP server)

Atenção: Abrir os arquivos diretamente com file:// não funcionará corretamente devido às restrições de módulos ES (import/export).

### Clonando o Repositório
git clone https://github.com/anderson-ferreira-ufc/comp_graf-trab2.git
cd comp_graf-trab2

### Opção 1: Usando a Extensão "Live Server" 
- Instale o VS Code: Se ainda não tiver, baixe e instale o Visual Studio Code.
- Vá para a aba de Extensões (Ctrl+Shift+X ou Cmd+Shift+X). Procure por "Live Server" (do autor Ritwick Dey) e clique em "Install".
- No VS Code, vá em File > Open Folder (ou Arquivo > Abrir Pasta). Navegue até a pasta onde você salvou todos os arquivos do jogo.
- Com a pasta do projeto aberta no VS Code, clique com o botão direito do mouse no arquivo index.html ou game.html. Selecione a opção "Open with Live Server".


### Opção 2: Usando um Servidor HTTP com Python
- Abra o Terminal (Linux/macOS) ou o Prompt de Comando/PowerShell (Windows). Digite python --version ou python3 --version. Se você vir uma versão do Python, ele está instalado. Se não, você precisará instalá-lo.

- No Terminal/Prompt de Comando, use o comando cd para navegar até a pasta onde você salvou os arquivos do jogo.
- Dentro da pasta do projeto, digite um dos seguintes comandos:
Para Python 3: python3 -m http.server
Para Python 2: python -m SimpleHTTPServer

- Você verá uma mensagem indicando que o servidor foi iniciado
- Abra seu navegador web e digite o endereço http://localhost:8000.

### Opção 3: Outros Servidores Web Locais
Se você já possui um servidor web local configurado (como Apache, Nginx ou Node.js http-server), coloque a pasta do projeto no diretório de serviço do seu servidor e acesse via a URL correspondente (ex: http://localhost/comp-graf-trab2/index.html).

Agora é só jogar! :)

## Características do Jogo

### Cesta
A cesta é construída visualmente no Three.js a partir de um conjunto de malhas texturizadas, e fisicamente modelada no Cannon.js como um corpo KINEMATIC composto por três formas de caixa (CANNON.Box). O movimento horizontal do mouse é traduzido para a posição X da cesta. Uma lógica de interpolação (distanciaX * 10) faz com que a cesta siga o mouse de forma responsiva, mas com um leve atraso. O movimento da cesta é restrito ao intervalo de -25 a 25 unidades no eixo X através de THREE.MathUtils.clamp.

### Maçãs - tipos e características

*Maçãs Normais:* Concedem 1 ponto.<br>
*Maçãs Douradas:* Têm 10% de chance de aparecer, valem 5 pontos e são visualmente distintas por uma coloração 0xe8e864 e propriedade emissive.<br>
*Maçãs de Vidro:* Possuem 25% de chance de aparecer e subtraem 1 ponto se caírem no chão, caracterizadas por transparent: true e opacity: 0.5.<br>

Todas as maçãs são representadas por esferas (THREE.SphereGeometry(1, 5, 5)) com detalhes de caule e folha. Após colidirem com a cesta ou o chão, são removidas da cena visual (scene.remove) e do mundo físico (world.removeBody) após 3.5 segundos (coleta) ou 4 segundos (chão).

Ao serem coletadas pela cesta, as maçãs ativam um efeito de explosão de partículas. Este efeito gera 20 pequenas caixas (THREE.BoxGeometry(0.2, 0.2, 0.2)) na posição da colisão, que se dispersam com velocidade aleatória e desaparecem em 0.5 a 1.0 segundos.

As maçãs surgem do céu em posições X aleatórias ((Math.random() - 0.5) * 40), a uma altura fixa de Y = 25. Como corpos dinâmicos (mass: 1) sujeitos à gravidade do Cannon.js, elas caem naturalmente, com sua frequência de surgimento controlada por um parâmetro ajustável via setInterval.

### Chão da cena

O chão é representado por uma malha THREE.PlaneGeometry(450, 300) com uma textura verde escura (0x006400). No mundo da física, ele é um CANNON.Body estático (type: CANNON.Body.STATIC) do tipo CANNON.Plane, rotacionado para ser horizontal (-Math.PI / 2 no eixo X) e posicionado em Y = -15.

### Funções de interação

Além da interação com o mouse, um painel de controle dat.gui oferece ao jogador a capacidade de ajustar a gravidade e a quantidade de maçãs caindo por segundo.

*Gravidade:* Permite modificar o valor da gravidade no eixo Y do Cannon.js, variando de -30 a -1, o que afeta diretamente a velocidade de queda das maçãs.

*Bolas / seg:* varia de 0.1 a 5 maçãs por segundo. Alterar esse valor reinicia o temporizador de criação de maçãs (clearInterval(ballTimer)).

*Tecla P :* Pausa e despausa o jogo exibindo ou escondendo uma tela de "JOGO PAUSADO" e o painel dat.gui, e interrompendo a geração de maçãs e a música de fundo.

### Músicas e Feedback Sonoro
Todos os sons são gerenciados por um THREE.AudioListener anexado à câmera, garantindo que o áudio seja espacializado corretamente.

*Música de Fundo:* Uma trilha sonora (music.mp3) é carregada e reproduzida em loop (setLoop(true)), com volume definido para 0.5.

*Feedback de Pontuação (pontoSound.wav):* Um som é reproduzido quando uma maçã é coletada na cesta, com volume 0.1.

*Feedback de Chão (groundSound.wav):* Um som diferente é emitido quando uma maçã colide com o chão, também com volume 0.1.

Todos os sons são gerenciados por um THREE.AudioListener anexado à câmera, garantindo que o áudio seja posicionado corretamente.

## Referências

*Efeitos Sonoros:* Os efeitos sonoros (SFX) foram gerados por meio do software Bfxr, que cria sons de 8-bit e 16-bit. A ferramenta garante que os efeitos criados sejam de domínio público, permitindo seu uso livremente no projeto.

*Trilha Sonora:* As faixas musicais de fundo são provenientes do acervo do site Freesound.org, um repositório de áudio sob licenças Creative Commons. As músicas foram escolhidas especificamente para se adequarem à atmosfera do jogo, com a devida consideração às suas licenças de uso.

## Equipe

Anderson Ferreira<br>
Ryan Gomes<br>
Junior Benedito Moreira<br>
Arthur Vieira<br>
Juliana Barboza<br>
Elizeu Duarte<br>
Eduardo Castro<br>
Jhonanthan Wyllian<br>


