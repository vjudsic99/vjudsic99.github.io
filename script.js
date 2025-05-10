document.addEventListener('DOMContentLoaded', () => {
    // Initialize WebsimSocket for multiplayer
    const room = new WebsimSocket();

    /* @tweakable loading screen duration in milliseconds */
    const loadingScreenDuration = 5000;

    /* @tweakable bot move delay in milliseconds */
    const botMoveDelay = 500;

    /* @tweakable minimax AI difficulty weights */
    const difficultyWeights = {
        medium: 0.6, // chance to make an optimal move
        hard: 0.8    // chance to make an optimal move
    };

    // Game state
    let gameBoard = ['', '', '', '', '', '', '', '', ''];
    let currentPlayer = 'X';
    let isGameActive = true;
    let gameMode = null; // 'bot' or 'friend'
    let botDifficulty = null;
    let isPlayerTurn = true;

    // DOM elements
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    const menuSection = document.getElementById('menu');
    const botDifficultySection = document.getElementById('bot-difficulty');
    const gameBoardSection = document.getElementById('game-board');
    const waitingRoomSection = document.getElementById('waiting-room');
    const cells = document.querySelectorAll('.cell');
    const statusDisplay = document.getElementById('status');
    const roomCodeDisplay = document.getElementById('room-code');
    
    // Buttons
    const playBotButton = document.getElementById('play-bot');
    const playFriendButton = document.getElementById('play-friend');
    const backToMenuButton = document.getElementById('back-to-menu');
    const backToMenuFromGameButton = document.getElementById('back-to-menu-from-game');
    const backFromWaitingButton = document.getElementById('back-from-waiting');
    const restartButton = document.getElementById('restart');
    const joinGameButton = document.getElementById('join-game');
    const difficultyButtons = document.querySelectorAll('[data-difficulty]');
    
    // Initialize websocket connection
    async function initializeMultiplayer() {
        await room.initialize();
        
        // Generate random room code
        if (!room.roomState.roomCode) {
            const randomCode = Math.floor(10000 + Math.random() * 90000).toString();
            room.updateRoomState({
                roomCode: randomCode,
                gameBoard: ['', '', '', '', '', '', '', '', ''],
                currentPlayer: 'X',
                isGameActive: true
            });
        }
        
        // Subscribe to room state changes
        room.subscribeRoomState((state) => {
            if (state.gameBoard) {
                gameBoard = state.gameBoard;
                currentPlayer = state.currentPlayer;
                isGameActive = state.isGameActive;
                updateGameBoard();
                updateStatus();
            }
        });
        
        // Subscribe to presence updates for multiplayer functionality
        room.subscribePresence((presence) => {
            const players = Object.keys(presence).filter(key => presence[key].isPlayer);
            
            // If we have two players, start the game
            if (players.length === 2 && gameMode === 'friend') {
                showSection(gameBoardSection);
                resetGame();
            }
        });
    }

    // Initialize the app
    function init() {
        // Show loading screen for tweakable duration
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            gameContainer.classList.remove('hidden');
            
            // Remove loading screen after fade out animation
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 1000);
        }, loadingScreenDuration);
        
        // Initialize multiplayer
        initializeMultiplayer();
        
        // Setup event listeners
        setupEventListeners();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Menu buttons
        playBotButton.addEventListener('click', () => {
            gameMode = 'bot';
            showSection(botDifficultySection);
        });
        
        playFriendButton.addEventListener('click', () => {
            gameMode = 'friend';
            showSection(waitingRoomSection);
            setupMultiplayerRoom();
        });
        
        // Difficulty buttons
        difficultyButtons.forEach(button => {
            button.addEventListener('click', () => {
                botDifficulty = button.getAttribute('data-difficulty');
                showSection(gameBoardSection);
                resetGame();
            });
        });
        
        // Back buttons
        backToMenuButton.addEventListener('click', () => showSection(menuSection));
        backToMenuFromGameButton.addEventListener('click', () => showSection(menuSection));
        backFromWaitingButton.addEventListener('click', () => showSection(menuSection));
        
        // Game cells
        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                const cellIndex = parseInt(cell.getAttribute('data-cell-index'));
                if (gameBoard[cellIndex] !== '' || !isGameActive || !isPlayerTurn) return;
                
                handleCellClick(cellIndex);
            });
        });
        
        // Restart button
        restartButton.addEventListener('click', resetGame);
        
        // Join game button
        joinGameButton.addEventListener('click', () => {
            const joinCode = document.getElementById('join-code').value;
            if (joinCode) {
                joinMultiplayerGame(joinCode);
            }
        });
    }

    // Setup multiplayer room
    function setupMultiplayerRoom() {
        // Update presence to indicate we're a player
        room.updatePresence({ isPlayer: true, symbol: 'X' });
        
        // Display room code
        roomCodeDisplay.textContent = room.roomState.roomCode;
    }

    // Join multiplayer game with code
    async function joinMultiplayerGame(code) {
        // Check if the room code exists (simplified - in real app would check server)
        if (code === room.roomState.roomCode) {
            // Mark as second player
            room.updatePresence({ isPlayer: true, symbol: 'O' });
            showSection(gameBoardSection);
            resetGame();
        } else {
            alert('Invalid room code. Please try again.');
        }
    }

    // Show a specific section and hide others
    function showSection(sectionToShow) {
        menuSection.classList.remove('active');
        menuSection.classList.add('hidden');
        botDifficultySection.classList.add('hidden');
        gameBoardSection.classList.add('hidden');
        waitingRoomSection.classList.add('hidden');
        
        sectionToShow.classList.remove('hidden');
        if (sectionToShow === menuSection) {
            menuSection.classList.add('active');
        }
    }

    // Handle cell click
    function handleCellClick(cellIndex) {
        if (gameMode === 'friend') {
            // In multiplayer, update the shared game state
            const updatedBoard = [...gameBoard];
            updatedBoard[cellIndex] = currentPlayer;
            
            room.updateRoomState({
                gameBoard: updatedBoard,
                currentPlayer: currentPlayer === 'X' ? 'O' : 'X',
                isGameActive: isGameActive
            });
        } else {
            // In single player, update local state
            gameBoard[cellIndex] = currentPlayer;
            cells[cellIndex].textContent = currentPlayer;
            cells[cellIndex].classList.add(currentPlayer.toLowerCase());
            
            // Check for win or draw
            if (checkWin()) {
                statusDisplay.textContent = `Player ${currentPlayer} has won!`;
                isGameActive = false;
                return;
            }
            
            if (checkDraw()) {
                statusDisplay.textContent = `Game ended in a draw!`;
                isGameActive = false;
                return;
            }
            
            // Switch player
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            updateStatus();
            
            // If playing against bot and it's bot's turn
            if (gameMode === 'bot' && currentPlayer === 'O') {
                isPlayerTurn = false;
                setTimeout(() => {
                    makeBotMove();
                    isPlayerTurn = true;
                }, botMoveDelay); 
            }
        }
    }

    // Make a bot move based on difficulty
    function makeBotMove() {
        let cellIndex;
        
        switch (botDifficulty) {
            case 'easy':
                cellIndex = makeEasyBotMove();
                break;
            case 'medium':
                cellIndex = Math.random() < difficultyWeights.medium ? makeHardBotMove() : makeEasyBotMove();
                break;
            case 'hard':
                cellIndex = Math.random() < difficultyWeights.hard ? makeHardBotMove() : makeEasyBotMove();
                break;
            case 'impossible':
                cellIndex = makeImpossibleBotMove();
                break;
            default:
                cellIndex = makeEasyBotMove();
        }
        
        gameBoard[cellIndex] = currentPlayer;
        cells[cellIndex].textContent = currentPlayer;
        cells[cellIndex].classList.add(currentPlayer.toLowerCase());
        
        // Check for win or draw
        if (checkWin()) {
            statusDisplay.textContent = `Player ${currentPlayer} has won!`;
            isGameActive = false;
            return;
        }
        
        if (checkDraw()) {
            statusDisplay.textContent = `Game ended in a draw!`;
            isGameActive = false;
            return;
        }
        
        // Switch back to player
        currentPlayer = 'X';
        updateStatus();
    }

    // Easy bot: random move
    function makeEasyBotMove() {
        const availableCells = gameBoard.map((cell, index) => 
            cell === '' ? index : null).filter(index => index !== null);
        
        return availableCells[Math.floor(Math.random() * availableCells.length)];
    }

    // Hard bot: tries to win or block player
    function makeHardBotMove() {
        // Try to win
        for (let i = 0; i < gameBoard.length; i++) {
            if (gameBoard[i] === '') {
                gameBoard[i] = 'O';
                if (checkWin()) {
                    gameBoard[i] = '';
                    return i;
                }
                gameBoard[i] = '';
            }
        }
        
        // Try to block
        for (let i = 0; i < gameBoard.length; i++) {
            if (gameBoard[i] === '') {
                gameBoard[i] = 'X';
                if (checkWin()) {
                    gameBoard[i] = '';
                    return i;
                }
                gameBoard[i] = '';
            }
        }
        
        // Take center if available
        if (gameBoard[4] === '') {
            return 4;
        }
        
        // Take a corner if available
        const corners = [0, 2, 6, 8].filter(index => gameBoard[index] === '');
        if (corners.length > 0) {
            return corners[Math.floor(Math.random() * corners.length)];
        }
        
        // Otherwise, make a random move
        return makeEasyBotMove();
    }

    // Impossible bot: minimax algorithm
    function makeImpossibleBotMove() {
        return minimax(gameBoard, 'O').index;
    }

    // Minimax algorithm for unbeatable AI
    function minimax(board, player) {
        const availableCells = board.map((cell, index) => 
            cell === '' ? index : null).filter(index => index !== null);
        
        // Check terminal states
        if (checkWinForBoard(board, 'X')) {
            return { score: -10 };
        } else if (checkWinForBoard(board, 'O')) {
            return { score: 10 };
        } else if (availableCells.length === 0) {
            return { score: 0 };
        }
        
        // Collect scores for each possible move
        const moves = [];
        
        for (let i = 0; i < availableCells.length; i++) {
            const move = {};
            move.index = availableCells[i];
            
            // Make the move
            board[availableCells[i]] = player;
            
            // Collect score from recursive call
            if (player === 'O') {
                const result = minimax(board, 'X');
                move.score = result.score;
            } else {
                const result = minimax(board, 'O');
                move.score = result.score;
            }
            
            // Undo the move
            board[availableCells[i]] = '';
            
            moves.push(move);
        }
        
        // Find the best move
        let bestMove;
        if (player === 'O') {
            // Maximizing player
            let bestScore = -Infinity;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score > bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        } else {
            // Minimizing player
            let bestScore = Infinity;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score < bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        }
        
        return moves[bestMove];
    }

    // Check if the game is won
    function checkWin() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];
        
        return winPatterns.some(pattern => {
            return pattern.every(index => {
                return gameBoard[index] === currentPlayer;
            });
        });
    }

    // Check if a specific player has won on a given board
    function checkWinForBoard(board, player) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];
        
        return winPatterns.some(pattern => {
            return pattern.every(index => {
                return board[index] === player;
            });
        });
    }

    // Check if the game is a draw
    function checkDraw() {
        return gameBoard.every(cell => cell !== '');
    }

    // Update status display
    function updateStatus() {
        statusDisplay.textContent = `Player ${currentPlayer}'s turn`;
    }

    // Update the game board UI based on gameBoard state
    function updateGameBoard() {
        cells.forEach((cell, index) => {
            cell.textContent = gameBoard[index];
            cell.className = 'cell';
            if (gameBoard[index] === 'X') {
                cell.classList.add('x');
            } else if (gameBoard[index] === 'O') {
                cell.classList.add('o');
            }
        });
    }

    // Reset the game
    function resetGame() {
        if (gameMode === 'friend') {
            // Reset shared state for multiplayer
            room.updateRoomState({
                gameBoard: ['', '', '', '', '', '', '', '', ''],
                currentPlayer: 'X',
                isGameActive: true
            });
        } else {
            // Reset local state for single player
            gameBoard = ['', '', '', '', '', '', '', '', ''];
            currentPlayer = 'X';
            isGameActive = true;
            isPlayerTurn = true;
            
            cells.forEach(cell => {
                cell.textContent = '';
                cell.className = 'cell';
            });
            
            updateStatus();
        }
    }

    // Start the app
    init();
});
