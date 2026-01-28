// Скрипт для учеников - полная версия
document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const screens = {
        connect: document.getElementById('connect-screen'),
        waiting: document.getElementById('waiting-screen'),
        game: document.getElementById('game-screen'),
        result: document.getElementById('result-screen'),
        final: document.getElementById('final-screen')
    };
    
    const gameCodeInput = document.getElementById('game-code');
    const playerNameInput = document.getElementById('player-name');
    const joinBtn = document.getElementById('join-btn');
    
    const connectedCodeSpan = document.getElementById('connected-code');
    const connectedNameSpan = document.getElementById('connected-name');
    const playerNameDisplay = document.getElementById('player-name-display');
    
    const currentQSpan = document.getElementById('current-q');
    const totalQSpan = document.getElementById('total-q');
    const timerSpan = document.getElementById('timer');
    const scoreSpan = document.getElementById('score');
    
    const questionText = document.getElementById('question-text');
    const questionCategory = document.getElementById('question-category');
    const questionHint = document.getElementById('question-hint');
    const optionsContainer = document.getElementById('options-container');
    const feedbackDiv = document.getElementById('feedback');
    
    const answerResultDiv = document.getElementById('answer-result');
    const pointsEarnedSpan = document.getElementById('points-earned');
    const totalScoreSpan = document.getElementById('total-score');
    
    const finalScoreValue = document.getElementById('final-score-value');
    const finalCorrectSpan = document.getElementById('final-correct');
    const finalRankSpan = document.getElementById('final-rank');
    
    const playAgainBtn = document.getElementById('play-again-btn');
    const homeBtn = document.getElementById('home-btn');
    
    // Firebase переменные
    let database;
    let gameRef;
    let playerRef;
    let playerId;
    let playerName = '';
    let gameCode = '';
    let currentQuestionIndex = 0;
    let timerInterval;
    let timeLeft = 30;
    
    // Инициализация
    function init() {
        console.log('Инициализация ученического интерфейса...');
        
        try {
            // Инициализация Firebase
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            console.log('Firebase подключен');
        } catch (error) {
            console.error('Ошибка Firebase:', error);
        }
        
        // Привязка обработчиков событий
        joinBtn.addEventListener('click', handleJoinGame);
        
        // Вход по Enter
        gameCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleJoinGame();
        });
        
        playerNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleJoinGame();
        });
        
        // Кнопки на финальном экране
        playAgainBtn.addEventListener('click', function() {
            location.reload();
        });
        
        homeBtn.addEventListener('click', function() {
            switchScreen('connect');
        });
        
        console.log('Инициализация завершена');
    }
    
    // === ВХОД В ИГРУ ===
    function handleJoinGame() {
        gameCode = gameCodeInput.value.trim();
        playerName = playerNameInput.value.trim() || 'Ученик';
        
        console.log('Попытка входа:', { gameCode, playerName });
        
        // Валидация
        if (!gameCode || gameCode.length !== 4 || !/^\d+$/.test(gameCode)) {
            alert('Введите корректный 4-значный код игры (только цифры)');
            gameCodeInput.focus();
            gameCodeInput.select();
            return;
        }
        
        if (!playerName) {
            alert('Введите ваше имя');
            playerNameInput.focus();
            playerNameInput.select();
            return;
        }
        
        // Блокируем кнопку
        joinBtn.disabled = true;
        joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подключение...';
        
        // Проверяем существование игры
        gameRef = database.ref(`games/${gameCode}`);
        
        gameRef.once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    console.log('Игра найдена, подключаемся...');
                    return connectToGame(snapshot.val());
                } else {
                    throw new Error('Игра с таким кодом не найдена');
                }
            })
            .catch(error => {
                console.error('Ошибка подключения:', error);
                alert('Ошибка: ' + error.message);
                joinBtn.disabled = false;
                joinBtn.innerHTML = '<i class="fas fa-play"></i> Присоединиться';
            });
    }
    
    function connectToGame(gameData) {
        // Генерируем ID игрока
        playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        playerRef = gameRef.child(`players/${playerId}`);
        
        console.log('Подключение как игрок:', playerId);
        
        // Сохраняем игрока в Firebase
        return playerRef.set({
            id: playerId,
            name: playerName,
            score: 0,
            correct: 0,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            lastAnswer: -1
        }).then(() => {
            console.log('Игрок сохранен в Firebase');
            
            // Обновляем UI
            connectedCodeSpan.textContent = gameCode;
            connectedNameSpan.textContent = playerName;
            playerNameDisplay.textContent = playerName;
            
            // Переключаем экран
            switchScreen('waiting');
            
            // Начинаем слушать игру
            setupGameListeners();
            
            // Восстанавливаем кнопку
            joinBtn.disabled = false;
            joinBtn.innerHTML = '<i class="fas fa-play"></i> Присоединиться';
        });
    }
    
    function setupGameListeners() {
        // Слушаем изменения в игре
        gameRef.on('value', handleGameUpdate);
        
        // Слушаем свой счет
        playerRef.on('value', snapshot => {
            const playerData = snapshot.val();
            if (playerData) {
                scoreSpan.textContent = playerData.score || 0;
                totalScoreSpan.textContent = playerData.score || 0;
            }
        });
        
        console.log('Слушатели игры установлены');
    }
    
    function handleGameUpdate(snapshot) {
        const gameData = snapshot.val();
        if (!gameData) {
            console.log('Игра удалена или не найдена');
            return;
        }
        
        const state = gameData.state || 'waiting';
        currentQuestionIndex = gameData.currentQuestion || 0;
        
        console.log('Обновление состояния игры:', state, 'вопрос:', currentQuestionIndex);
        
        // Обновляем информацию
        if (gameData.totalQuestions) {
            totalQSpan.textContent = gameData.totalQuestions;
        }
        
        // Переключаем экраны
        switchScreen(state);
        
        // Обработка разных состояний
        switch(state) {
            case 'waiting':
                // Ничего не делаем, просто ждем
                break;
                
            case 'question':
                showQuestion(currentQuestionIndex);
                startTimer();
                break;
                
            case 'results':
                showResult(currentQuestionIndex);
                break;
                
            case 'finished':
                showFinalResults();
                break;
        }
    }
    
    function switchScreen(screenName) {
        console.log('Переключение на экран:', screenName);
        
        // Скрываем все экраны
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        
        // Показываем нужный экран
        if (screens[screenName]) {
            screens[screenName].classList.add('active');
        }
    }
    
    // === ПОКАЗ ВОПРОСА ===
    function showQuestion(index) {
        if (!gameRef) return;
        
        console.log('Показ вопроса:', index);
        
        gameRef.child(`questions/${index}`).once('value')
            .then(snapshot => {
                const question = snapshot.val();
                if (!question) {
                    console.error('Вопрос не найден:', index);
                    return;
                }
                
                // Обновляем UI
                currentQSpan.textContent = index + 1;
                questionCategory.textContent = question.category;
                questionText.textContent = question.question;
                questionHint.innerHTML = `<i class="fas fa-lightbulb"></i><span>${question.hint || 'Без подсказки'}</span>`;
                
                // Показываем варианты ответов
                renderOptions(question.options);
                
                // Скрываем фидбэк
                feedbackDiv.style.display = 'none';
                feedbackDiv.classList.remove('show');
                
            }).catch(error => {
                console.error('Ошибка загрузки вопроса:', error);
            });
    }
    
    function renderOptions(options) {
        let optionsHtml = '';
        
        options.forEach((option, index) => {
            optionsHtml += `
                <div class="option" data-index="${index}">
                    <div class="option-letter">${String.fromCharCode(65 + index)}</div>
                    <div class="option-text">${option}</div>
                </div>
            `;
        });
        
        optionsContainer.innerHTML = optionsHtml;
        
        // Добавляем обработчики выбора
        const optionElements = optionsContainer.querySelectorAll('.option');
        optionElements.forEach(option => {
            option.addEventListener('click', function() {
                if (this.classList.contains('disabled')) return;
                
                const selectedIndex = parseInt(this.getAttribute('data-index'));
                submitAnswer(selectedIndex);
                
                // Отключаем все варианты
                optionElements.forEach(opt => {
                    opt.classList.add('disabled');
                    opt.style.cursor = 'not-allowed';
                });
                
                // Подсвечиваем выбранный вариант
                this.classList.add('selected');
            });
        });
    }
    
    function startTimer() {
        clearInterval(timerInterval);
        timeLeft = 30;
        timerSpan.textContent = timeLeft;
        timerSpan.style.color = '';
        
        timerInterval = setInterval(() => {
            timeLeft--;
            timerSpan.textContent = timeLeft;
            
            // Меняем цвет при малом времени
            if (timeLeft <= 10) {
                timerSpan.style.color = '#ff6b6b';
            }
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                handleTimeout();
            }
        }, 1000);
    }
    
    function handleTimeout() {
        console.log('Время вышло');
        
        // Отключаем все варианты
        const optionElements = optionsContainer.querySelectorAll('.option');
        optionElements.forEach(opt => {
            opt.classList.add('disabled');
            opt.style.cursor = 'not-allowed';
        });
        
        // Показываем сообщение о таймауте
        showFeedback('timeout', -1, -1, 0);
        
        // Сохраняем "нет ответа"
        playerRef.update({
            [`answers/${currentQuestionIndex}`]: -1,
            lastAnswer: currentQuestionIndex
        });
    }
    
    // === ОТПРАВКА ОТВЕТА ===
    function submitAnswer(answerIndex) {
        clearInterval(timerInterval);
        
        console.log('Отправка ответа:', answerIndex);
        
        if (!gameRef) return;
        
        // Получаем вопрос для проверки правильности
        gameRef.child(`questions/${currentQuestionIndex}`).once('value')
            .then(snapshot => {
                const question = snapshot.val();
                if (!question) return;
                
                const isCorrect = answerIndex === question.correct;
                
                // Сохраняем ответ
                playerRef.update({
                    [`answers/${currentQuestionIndex}`]: answerIndex,
                    lastAnswer: currentQuestionIndex
                }).then(() => {
                    // Вычисляем очки
                    calculateScore(answerIndex, question.correct, isCorrect);
                    
                    // Показываем обратную связь
                    showFeedback(isCorrect ? 'correct' : 'incorrect', answerIndex, question.correct, 0);
                });
                
            }).catch(error => {
                console.error('Ошибка отправки ответа:', error);
            });
    }
    
    function calculateScore(answerIndex, correctIndex, isCorrect) {
        if (!playerRef) return;
        
        playerRef.transaction(playerData => {
            if (playerData) {
                let pointsEarned = 0;
                
                if (isCorrect) {
                    // Правильный ответ: базовые очки + бонус за скорость
                    const basePoints = 100;
                    const speedBonus = Math.max(0, timeLeft * 3); // Чем быстрее, тем больше
                    pointsEarned = basePoints + speedBonus;
                    
                    playerData.score = (playerData.score || 0) + pointsEarned;
                    playerData.correct = (playerData.correct || 0) + 1;
                }
                
                // Сохраняем очки за этот вопрос
                playerData.lastPoints = pointsEarned;
            }
            return playerData;
        });
    }
    
    function showFeedback(type, answerIndex, correctIndex, points) {
        let feedbackHtml = '';
        
        switch(type) {
            case 'correct':
                feedbackHtml = `
                    <div class="feedback feedback-correct show">
                        <h3><i class="fas fa-check-circle"></i> Правильно!</h3>
                        <p>Отличный ответ!</p>
                        <p>+${points || '???'} очков</p>
                    </div>
                `;
                break;
                
            case 'incorrect':
                const correctLetter = String.fromCharCode(65 + correctIndex);
                feedbackHtml = `
                    <div class="feedback feedback-incorrect show">
                        <h3><i class="fas fa-times-circle"></i> Неправильно</h3>
                        <p>Правильный ответ: ${correctLetter}</p>
                    </div>
                `;
                break;
                
            case 'timeout':
                feedbackHtml = `
                    <div class="feedback feedback-timeout show">
                        <h3><i class="fas fa-clock"></i> Время вышло!</h3>
                        <p>Вы не успели ответить</p>
                    </div>
                `;
                break;
        }
        
        feedbackDiv.innerHTML = feedbackHtml;
        feedbackDiv.style.display = 'block';
    }
    
    // === ПОКАЗ РЕЗУЛЬТАТА ===
    function showResult(questionIndex) {
        if (!playerRef) return;
        
        console.log('Показ результата для вопроса:', questionIndex);
        
        playerRef.once('value')
            .then(snapshot => {
                const playerData = snapshot.val();
                if (!playerData) return;
                
                // Получаем вопрос для правильного ответа
                return gameRef.child(`questions/${questionIndex}`).once('value')
                    .then(qSnapshot => {
                        const question = qSnapshot.val();
                        if (!question) return;
                        
                        const lastAnswer = playerData.answers && playerData.answers[questionIndex];
                        const isCorrect = lastAnswer === question.correct;
                        
                        displayResult(isCorrect, lastAnswer, question.correct, playerData.lastPoints || 0);
                    });
            })
            .catch(error => {
                console.error('Ошибка показа результата:', error);
            });
    }
    
    function displayResult(isCorrect, answerIndex, correctIndex, points) {
        let resultHtml = '';
        
        if (isCorrect) {
            resultHtml = `
                <div class="answer-result result-correct">
                    <i class="fas fa-check-circle"></i>
                    <div>Правильно!</div>
                    <div class="points">+${points} очков</div>
                </div>
            `;
            
            pointsEarnedSpan.textContent = `+${points} очков`;
            pointsEarnedSpan.style.color = '#2ecc71';
        } else {
            const correctLetter = String.fromCharCode(65 + correctIndex);
            const answerLetter = answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : 'Нет ответа';
            
            resultHtml = `
                <div class="answer-result result-wrong">
                    <i class="fas fa-times-circle"></i>
                    <div>${answerIndex >= 0 ? 'Неправильно' : 'Время вышло'}</div>
                    <div class="correct-answer">Правильный ответ: ${correctLetter}</div>
                </div>
            `;
            
            pointsEarnedSpan.textContent = '0 очков';
            pointsEarnedSpan.style.color = '#e74c3c';
        }
        
        answerResultDiv.innerHTML = resultHtml;
    }
    
    // === ФИНАЛЬНЫЕ РЕЗУЛЬТАТЫ ===
    function showFinalResults() {
        if (!playerRef || !gameRef) return;
        
        console.log('Показ финальных результатов');
        
        // Получаем данные игрока
        playerRef.once('value')
            .then(snapshot => {
                const playerData = snapshot.val();
                if (playerData) {
                    finalScoreValue.textContent = playerData.score || 0;
                    
                    // Получаем общее количество вопросов
                    return gameRef.once('value').then(gameSnapshot => {
                        const gameData = gameSnapshot.val();
                        const totalQuestions = gameData?.totalQuestions || 10;
                        finalCorrectSpan.textContent = `${playerData.correct || 0}/${totalQuestions}`;
                        
                        // Загружаем лидерборд
                        return loadLeaderboard();
                    });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки финальных результатов:', error);
            });
    }
    
    function loadLeaderboard() {
        const playersRef = gameRef.child('players');
        
        playersRef.once('value')
            .then(snapshot => {
                const players = snapshot.val() || {};
                const sortedPlayers = Object.values(players)
                    .sort((a, b) => (b.score || 0) - (a.score || 0));
                
                // Находим свое место
                const myRank = sortedPlayers.findIndex(p => p.id === playerId) + 1;
                finalRankSpan.textContent = myRank;
                
                // Показываем топ-5
                displayLeaderboard(sortedPlayers);
            })
            .catch(error => {
                console.error('Ошибка загрузки лидерборда:', error);
            });
    }
    
    function displayLeaderboard(sortedPlayers) {
        let html = '';
        const topPlayers = sortedPlayers.slice(0, 5);
        
        topPlayers.forEach((player, index) => {
            const isMe = player.id === playerId;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            
            html += `
                <div class="leaderboard-item ${isMe ? 'my-result' : ''}">
                    <span class="rank">${index + 1} ${medal}</span>
                    <span class="name">${player.name || 'Аноним'} ${isMe ? '(Вы)' : ''}</span>
                    <span class="score">${player.score || 0}</span>
                </div>
            `;
        });
        
        const finalLeaderboard = document.getElementById('final-leaderboard');
        if (finalLeaderboard) {
            finalLeaderboard.innerHTML = html || '<p>Нет данных</p>';
        }
    }
    
    // Запуск инициализации
    init();
});
