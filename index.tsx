import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import confetti from 'canvas-confetti';

// Array de rutas a las imágenes locales que el usuario deberá subir
const IMAGE_PATHS = [
  '/images/image-1.png',
  '/images/image-2.png',
  '/images/image-3.png',
  '/images/image-4.png',
  '/images/image-5.png',
  '/images/image-6.png',
  '/images/image-7.png',
  '/images/image-8.png',
  '/images/image-9.png',
  '/images/image-10.png',
];

const GRID_ROWS = 5;
const GRID_COLS = 4;
const GAME_DURATION = 180; // 3 minutes

interface CardState {
  id: number;
  imageId: number;
  imageUrl: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface HighScore {
    name: string;
    time: number;
    moves: number;
}

type GameState = 'start' | 'playing' | 'awaitingName' | 'won' | 'lost';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const App = () => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [mismatchedCards, setMismatchedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  const correctSoundRef = useRef<HTMLAudioElement>(null);
  const wrongSoundRef = useRef<HTMLAudioElement>(null);
  const winSoundRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    try {
        const storedScores = localStorage.getItem('memoryGameHighScores');
        if (storedScores) {
            setHighScores(JSON.parse(storedScores));
        }
    } catch (error) {
        console.error("Failed to load high scores:", error);
    }
  }, []);

  const shuffledCards = useMemo(() => {
    const requiredImagesCount = (GRID_ROWS * GRID_COLS) / 2;
    const cardPairs = IMAGE_PATHS.slice(0, requiredImagesCount).map((imagePath, index) => ({
      imageId: index,
      imageUrl: imagePath,
      isFlipped: false,
      isMatched: false,
    }));

    return [...cardPairs, ...cardPairs]
      .sort(() => Math.random() - 0.5)
      .map((card, index) => ({ ...card, id: index }));
  }, []);

  useEffect(() => {
    if (gameState !== 'playing' || timeLeft <= 0) {
      if (timeLeft <= 0 && gameState === 'playing') setGameState('lost');
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (flippedCards.length !== 2) return;

    setIsChecking(true);
    const [firstCardIndex, secondCardIndex] = flippedCards;
    const firstCard = cards[firstCardIndex];
    const secondCard = cards[secondCardIndex];
    
    setMoves(prev => prev + 1);

    if (firstCard.imageId === secondCard.imageId) {
      correctSoundRef.current?.play().catch(e => console.error("Error playing sound:", e));
      setCards(prevCards =>
        prevCards.map(card =>
          card.id === firstCard.id || card.id === secondCard.id
            ? { ...card, isMatched: true }
            : card
        )
      );
      setFlippedCards([]);
      setIsChecking(false);
    } else {
      wrongSoundRef.current?.play().catch(e => console.error("Error playing sound:", e));
      setMismatchedCards([firstCard.id, secondCard.id]);
      setTimeout(() => {
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === firstCard.id || card.id === secondCard.id
              ? { ...card, isFlipped: false }
              : card
          )
        );
        setFlippedCards([]);
        setMismatchedCards([]);
        setIsChecking(false);
      }, 1000);
    }
  }, [flippedCards, cards]);
  
  useEffect(() => {
    if (cards.length > 0 && cards.every(card => card.isMatched)) {
      winSoundRef.current?.play().catch(e => console.error("Error playing sound:", e));
      setGameState('awaitingName');
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  }, [cards]);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleFullscreenChange]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const toggleMute = () => {
      setIsMuted(prev => {
          const newMutedState = !prev;
          if (correctSoundRef.current) correctSoundRef.current.muted = newMutedState;
          if (wrongSoundRef.current) wrongSoundRef.current.muted = newMutedState;
          if (winSoundRef.current) winSoundRef.current.muted = newMutedState;
          return newMutedState;
      });
  };

  const handleStartGame = () => {
    setCards(shuffledCards);
    setGameState('playing');
    setMoves(0);
    setFlippedCards([]);
    setTimeLeft(GAME_DURATION);
    setPlayerName('');
  };

  const handleCardClick = useCallback((index: number) => {
    if (isChecking || flippedCards.length === 2 || cards[index].isFlipped || cards[index].isMatched) {
      return;
    }

    setCards(prevCards =>
      prevCards.map((card, i) =>
        i === index ? { ...card, isFlipped: true } : card
      )
    );
    setFlippedCards(prev => [...prev, index]);
  }, [isChecking, flippedCards.length, cards]);
  
  const handleResetGame = () => {
    setGameState('start');
    setCards([]);
    setFlippedCards([]);
    setMoves(0);
    setIsChecking(false);
    setTimeLeft(GAME_DURATION);
  };
  
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const timeTaken = GAME_DURATION - timeLeft;
    const newScore: HighScore = { name: playerName.trim(), time: timeTaken, moves };
    
    const updatedScores = [...highScores, newScore]
        .sort((a, b) => {
            if (a.time !== b.time) {
                return a.time - b.time; // Less time is better
            }
            return a.moves - b.moves; // Fewer moves is better
        })
        .slice(0, 5);

    try {
        localStorage.setItem('memoryGameHighScores', JSON.stringify(updatedScores));
        setHighScores(updatedScores);
    } catch (error) {
        console.error("Failed to save high scores:", error);
    }
    
    setGameState('won');
  };

  const HighScoresTable = React.memo(({scores}: {scores: HighScore[]}) => (
    <div className="highscore-container">
        <h3>Top 5 Puntuaciones</h3>
        {scores.length > 0 ? (
            <ol className="highscore-list">
                {scores.map((score, index) => (
                    <li key={index}>
                        <span className="rank">{index + 1}.</span>
                        <span className="name">{score.name}</span>
                        <span className="score">{formatTime(score.time)} / {score.moves} mov.</span>
                    </li>
                ))}
            </ol>
        ) : (
            <p>Aún no hay puntuaciones. ¡Sé el primero!</p>
        )}
    </div>
  ));

  const renderModal = (title: string, message: string, showHighScores = false) => (
     <div className="modal-overlay">
        <div className="modal-content">
            <h2>{title}</h2>
            <p>{message}</p>
            {showHighScores && <HighScoresTable scores={highScores} />}
            <button onClick={handleResetGame}>Jugar de Nuevo</button>
        </div>
    </div>
  );
  
  const renderNameInputModal = () => (
    <div className="modal-overlay">
       <div className="modal-content">
           <h2>¡Victoria!</h2>
           <p>Completaste el juego en {formatTime(GAME_DURATION - timeLeft)} con {moves} intentos.</p>
           <p>Ingresa tu nombre para guardar tu puntuación:</p>
           <form onSubmit={handleNameSubmit}>
               <input 
                   type="text" 
                   value={playerName} 
                   onChange={(e) => setPlayerName(e.target.value)}
                   placeholder="Tu nombre"
                   maxLength={15}
                   required
               />
               <button type="submit">Guardar Puntuación</button>
           </form>
       </div>
   </div>
 );
  
  const renderStartScreen = () => (
    <div className="start-container">
      <h1>Juego de Memoria</h1>
      <p>Encuentra todos los pares antes de que se acabe el tiempo.</p>
      <button onClick={handleStartGame}>
        Comenzar Juego
      </button>
      <HighScoresTable scores={highScores} />
    </div>
  );

  return (
    <div className="app-container">
      <audio ref={correctSoundRef} src="/audio/correct.mp3" preload="auto" muted={isMuted}></audio>
      <audio ref={wrongSoundRef} src="/audio/wrong.mp3" preload="auto" muted={isMuted}></audio>
      <audio ref={winSoundRef} src="/audio/win.mp3" preload="auto" muted={isMuted}></audio>
      
      {gameState === 'start' && renderStartScreen()}
      
      {gameState === 'playing' && (
        <div className="game-wrapper">
          <header className="game-header">
            <div className="stat-item">
                <span>Tiempo</span>
                <div className="timer">{formatTime(timeLeft)}</div>
            </div>
            <div className="stat-item">
                <span>Intentos</span>
                <div className="moves-counter">{moves}</div>
            </div>
          </header>
          <main className="game-board" style={{'--rows': GRID_ROWS, '--cols': GRID_COLS} as React.CSSProperties}>
            {cards.map((card, index) => (
              <div
                key={card.id}
                className={`card ${card.isFlipped || card.isMatched ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''} ${mismatchedCards.includes(card.id) ? 'mismatched' : ''}`}
                onClick={() => handleCardClick(index)}
                aria-label={`Carta ${index + 1}`}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="card-inner">
                  <div className="card-back">
                    <span>{index + 1}</span>
                  </div>
                  <div className="card-front">
                     <img src={card.imageUrl} alt={`Imagen de la carta`} />
                  </div>
                </div>
              </div>
            ))}
          </main>
          <footer className="game-footer">
              <button className="icon-button" aria-label="Sonido" onClick={toggleMute}>
                {isMuted ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                )}
              </button>
              <button className="icon-button" aria-label="Pantalla completa" onClick={toggleFullscreen}>
                {isFullscreen ? 
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg> :
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                }
              </button>
          </footer>
        </div>
      )}

      {gameState === 'awaitingName' && renderNameInputModal()}
      {gameState === 'won' && renderModal('¡Puntuación Guardada!', '¡Felicidades, estás en el top 5!', true)}
      {gameState === 'lost' && renderModal('¡Juego Terminado!', 'Se acabó el tiempo. ¡Inténtalo de nuevo!')}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
