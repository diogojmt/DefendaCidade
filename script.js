document.addEventListener('DOMContentLoaded', () => {
    const gameArea = document.getElementById('game-area');
    const scoreDisplay = document.getElementById('score');
    const stageDisplay = document.getElementById('stage');
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const buildingsDisplay = document.getElementById('buildings');
    let towers = document.querySelectorAll('.tower');
    let towersRemaining = towers.length;

    if (!scoreDisplay || !stageDisplay || !buildingsDisplay) {
        console.error('Elementos de pontuação, estágio ou prédios restantes não foram encontrados no DOM.');
        return;
    }

    let score = 0;
    let stage = 1;
    let buildingsRemaining = document.querySelectorAll('.building, .house, .church').length; // Contagem inicial de prédios
    let gameInterval;
    let gamePaused = false;
    let enemySpeed = 1; // Velocidade inicial dos inimigos
    let enemySpawnRate = 2000; // Taxa inicial de criação de inimigos

    // Definir sons
    const sirenSound = new Audio('sounds/Sirene.mp3');
    sirenSound.loop = true;
    sirenSound.volume = 0.5;

    const radioSound = new Audio('sounds/Radio.mp3');
    radioSound.loop = true;
    radioSound.volume = 0.5;

    const shootSound = new Audio('sounds/Disparo.mp3');
    const hitSound = new Audio('sounds/Explosao.mp3');
    const enemyReachedSound = new Audio('sounds/Inimigo_base.mp3');

    // Atualizar o display de pontuação, estágio e prédios restantes
    function updateScore() {
        scoreDisplay.textContent = `Score: ${score}`;
    }

    function updateStage() {
        stageDisplay.textContent = `Stage: ${stage}`;
    }

    function updateBuildings() {
        buildingsDisplay.textContent = `Buildings Remaining: ${buildingsRemaining}`;
    }

    function updateTowers() {
        towersRemaining = document.querySelectorAll('.tower').length;
    }

    // Função que verifica o fim do jogo
    function checkGameOver() {
        if (buildingsRemaining <= 0) {
            pauseGame(); // Pausar o jogo
            alert('Game Over! All buildings have been destroyed.'); // Exibir mensagem de fim de jogo
        } else if (towersRemaining <= 0) {
            pauseGame();
            alert('Game Over! All towers have been destroyed.'); // Exibir mensagem de fim de jogo
        }
    }

    // Incrementar a pontuação e verificar a progressão de estágio
    function incrementScore() {
        score += 100; // Cada inimigo destruído vale 100 pontos
        updateScore();

        // Verificar se o estágio deve ser incrementado
        if (score % 1000 === 0) { // A cada 1000 pontos, o estágio aumenta
            incrementStage();
        }
    }

    // Aumentar o estágio e a dificuldade
    function incrementStage() {
        stage += 1;
        updateStage();
        enemySpeed += 0.5; // Aumenta a velocidade dos inimigos
        enemySpawnRate -= 200; // Aumenta a frequência dos inimigos

        // Ajustar o intervalo de criação de inimigos
        clearInterval(gameInterval);
        gameInterval = setInterval(createEnemy, Math.max(500, enemySpawnRate)); // Limite mínimo de 500ms
    }

    function playRandomDebrisSound() {
        const debrisSounds = [
            new Audio('sounds/Destrocos1.mp3'),
            new Audio('sounds/Destrocos2.mp3'),
            new Audio('sounds/Destrocos3.mp3'),
            new Audio('sounds/Destrocos4.mp3')
        ];
        
        const randomIndex = Math.floor(Math.random() * debrisSounds.length);
        debrisSounds[randomIndex].play();
    }

    function triggerExplosion(projectileRect, enemyRect) {
        const explosion = document.createElement('div');
        explosion.classList.add('explosion');

        const gameAreaRect = gameArea.getBoundingClientRect();

        // Calcular a posição da explosão no ponto de impacto
        const explosionLeft = projectileRect.left - gameAreaRect.left + (enemyRect.width / 2) - 40;
        const explosionTop = projectileRect.top - gameAreaRect.top + (enemyRect.height / 2) - 40;

        explosion.style.left = `${explosionLeft}px`;
        explosion.style.top = `${explosionTop}px`;

        gameArea.appendChild(explosion);

        setTimeout(() => {
            explosion.remove();
            triggerFire({ left: explosionLeft, top: explosionTop, width: 80, height: 80 });
        }, 300);
    }

    function shootProjectileFromTower(tower, targetX, targetY) {
        const cannon = tower.querySelector('.cannon');
        
        // Verifica se o canhão existe antes de prosseguir
        if (!cannon) {
            console.error('Cannon not found in tower:', tower);
            return;
        }

        const projectile = document.createElement('div');
        projectile.classList.add('projectile');

        const cannonRect = cannon.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();
        
        // Calcular a posição inicial do projétil baseado no centro do canhão
        const startX = cannonRect.left + (cannonRect.width / 2) - gameAreaRect.left;
        const startY = cannonRect.top - gameAreaRect.top;

        projectile.style.left = `${startX}px`;
        projectile.style.top = `${startY}px`;

        gameArea.appendChild(projectile);

        const angleRad = Math.atan2(targetY - startY, targetX - startX);
        const speed = 5;
        const dx = Math.cos(angleRad) * speed;
        const dy = Math.sin(angleRad) * speed;

        function moveProjectile() {
            const currentX = parseFloat(projectile.style.left);
            const currentY = parseFloat(projectile.style.top);

            projectile.style.left = `${currentX + dx}px`;
            projectile.style.top = `${currentY + dy}px`;

            // Verificar se o projétil saiu da área de jogo
            if (currentX < 0 || currentX > gameArea.clientWidth || currentY < 0 || currentY > gameArea.clientHeight) {
                projectile.remove();
            } else {
                requestAnimationFrame(moveProjectile);
            }

            // Verificar colisão com inimigos
            document.querySelectorAll('.enemy').forEach((enemy) => {
                if (isCollision(projectile, enemy)) {
                    const enemyRect = enemy.getBoundingClientRect();
                    const projectileRect = projectile.getBoundingClientRect();
                    projectile.remove();
                    enemy.remove();
                    hitSound.play();
                    playRandomDebrisSound();
                    triggerExplosion(projectileRect, enemyRect);
                    incrementScore(); // Incrementa a pontuação quando um inimigo é destruído
                }
            });
        }

        moveProjectile();
    }

    gameArea.addEventListener('click', (event) => {
        if (gamePaused) return;

        const rect = gameArea.getBoundingClientRect();
        const targetX = event.clientX - rect.left;
        const targetY = event.clientY - rect.top;

        // Disparar projéteis de todas as torres
        towers.forEach(tower => {
            shootProjectileFromTower(tower, targetX, targetY);
        });
    });

    function createEnemy() {
        if (gamePaused) return;

        const enemy = document.createElement('div');
        enemy.classList.add('enemy');

        const startX = Math.random() * (gameArea.clientWidth - 40); // 40 é o tamanho da bomba
        enemy.style.left = `${startX}px`;
        enemy.style.top = '0px';

        gameArea.appendChild(enemy);

        // Criar rastro de faíscas e fumaça
        createTrail(enemy);

        function moveEnemy() {
            if (gamePaused) return;

            const currentY = parseFloat(enemy.style.top);
            enemy.style.top = `${currentY + enemySpeed}px`; // Velocidade do inimigo aumenta conforme o estágio

            document.querySelectorAll('.building, .house, .church, .tower').forEach((element) => {
                if (isCollision(enemy, element)) {
                    const rect = element.getBoundingClientRect();
                    triggerExplosion(rect);
                    element.remove();
                    triggerFire(rect);
                    enemy.remove();
                    if (element.classList.contains('tower')) {
                        updateTowers(); // Atualiza a contagem de torres restantes
                    } else {
                        buildingsRemaining -= 1; // Reduz um prédio quando é destruído
                        updateBuildings(); // Atualiza o display de prédios restantes
                    }
                    checkGameOver(); // Verifica se o jogo acabou
                }
            });

            if (currentY > gameArea.clientHeight - 40) { // 40 é o tamanho da bomba
                triggerGroundFire(enemy.getBoundingClientRect());
                enemy.remove();
                enemyReachedSound.play();
                playRandomDebrisSound();
            } else {
                requestAnimationFrame(moveEnemy);
            }
        }

        moveEnemy();
    }

    function isCollision(element1, element2) {
        const rect1 = element1.getBoundingClientRect();
        const rect2 = element2.getBoundingClientRect();

        return !(
            rect1.top > rect2.bottom ||
            rect1.bottom < rect2.top ||
            rect1.right < rect2.left ||
            rect1.left > rect2.right
        );
    }

    function triggerExplosion(rect) {
        const explosion = document.createElement('div');
        explosion.classList.add('explosion');

        const gameAreaRect = gameArea.getBoundingClientRect();

        // Garantir que a explosão esteja dentro dos limites do game-area
        let explosionLeft = rect.left - gameAreaRect.left + rect.width / 2 - 40;
        let explosionTop = rect.top - gameAreaRect.top + rect.height / 2 - 40;

        explosionLeft = Math.max(0, Math.min(explosionLeft, gameAreaRect.width - 80)); // 80 é o tamanho da explosão
        explosionTop = Math.max(0, Math.min(explosionTop, gameAreaRect.height - 80));

        explosion.style.left = `${explosionLeft}px`;
        explosion.style.top = `${explosionTop}px`;

        gameArea.appendChild(explosion);

        setTimeout(() => {
            explosion.remove();
            triggerFire({left: explosionLeft, top: explosionTop, width: 80, height: 80});
        }, 300);
    }

    function triggerFog() {
        for (let i = 0; i < 2; i++) { // Criando duas camadas de névoa
            const fog = document.createElement('div');
            fog.classList.add('fog-layer');
            fog.style.zIndex = (8 + i); // Garantir que as camadas tenham z-index diferentes
            gameArea.appendChild(fog);
        }
    }

    function triggerFire(rect) {
        const fire = document.createElement('div');
        fire.classList.add('fire');

        const gameAreaRect = gameArea.getBoundingClientRect();
        fire.style.left = `${rect.left - gameAreaRect.left + rect.width / 2 - 30}px`;
        fire.style.top = `${rect.top - gameAreaRect.top + rect.height / 2 - 30}px`;

        gameArea.appendChild(fire);

        // Adicionar faíscas ao redor do fogo
        for (let i = 0; i < 5; i++) {
            const spark = document.createElement('div');
            spark.classList.add('spark');
            spark.style.left = `${Math.max(0, Math.min(parseFloat(fire.style.left) + Math.random() * 20 - 10, gameAreaRect.width - 5))}px`;
            spark.style.top = `${Math.max(0, Math.min(parseFloat(fire.style.top) + Math.random() * 20 - 10, gameAreaRect.height - 5))}px`;
            gameArea.appendChild(spark);

            // Remover a faísca após a animação
            setTimeout(() => {
                spark.remove();
            }, 1000);
        }

        // Remover o fogo após um tempo
        setTimeout(() => {
            fire.remove();
        }, 5000);  // Remover fogo após 5 segundos
    }

    function triggerGroundFire(rect) {
        triggerFire(rect); // Reutiliza o efeito de fogo no chão
    }

    function createTrail(enemy) {
		const trailInterval = setInterval(() => {
			if (gamePaused) return;

			// Criar faíscas
			const spark = document.createElement('div');
			spark.classList.add('spark-trail');
			spark.style.left = `${parseFloat(enemy.style.left) + enemy.clientWidth / 2 - 2}px`;
			spark.style.top = `${parseFloat(enemy.style.top) + enemy.clientHeight}px`;
			gameArea.appendChild(spark);

			// Criar fumaça
			const smoke = document.createElement('div');
			smoke.classList.add('smoke-trail');
			smoke.style.left = `${parseFloat(enemy.style.left) + enemy.clientWidth / 2 - 10}px`;
			smoke.style.top = `${parseFloat(enemy.style.top) + enemy.clientHeight}px`;
			gameArea.appendChild(smoke);

			// Remover faíscas e fumaça após 300ms
			setTimeout(() => {
				spark.remove();
				smoke.remove();
			}, 300);

		}, 200);  // Intervalo de criação de rastro

		// Limpar o intervalo quando a bomba for removida
		enemy.addEventListener('remove', () => {
			clearInterval(trailInterval);
		});
	}

    function startGame() {
        if (!gameInterval) {
            gameInterval = setInterval(createEnemy, enemySpawnRate); // Criar inimigos a cada 2 segundos (inicial)
        }
        gamePaused = false;
        sirenSound.play();
        radioSound.play();
    }

    function pauseGame() {
        gamePaused = true;
        clearInterval(gameInterval);
        gameInterval = null;
        sirenSound.pause();
        radioSound.pause();
    }

    playButton.addEventListener('click', () => {
        if (gamePaused) startGame();
    });

    pauseButton.addEventListener('click', () => {
        if (!gamePaused) pauseGame();
    });

    pauseGame(); // O jogo começa pausado, o usuário deve clicar em "Play" para iniciar

    // Adicionar janelas e portas após carregar o jogo
    document.querySelectorAll('.building, .house, .church').forEach(element => {
        const window = document.createElement('div');
        window.classList.add('window');
        element.appendChild(window);

        const door = document.createElement('div');
        door.classList.add('door');
        element.appendChild(door);
    });

    // Adicionar janelas às torres
    towers.forEach(tower => {
        const towerWindow = document.createElement('div');
        towerWindow.classList.add('window');
        tower.appendChild(towerWindow);
    });

    // Atualizar a pontuação, o estágio e os prédios restantes na interface
    updateScore();
    updateStage();
    updateBuildings();
});
