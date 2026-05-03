/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Music, 
  Trophy, 
  Gamepad2, 
  RotateCcw,
  Volume2,
  ListMusic
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types ---
interface Point {
  x: number;
  y: number;
}

interface Track {
  id: number;
  title: string;
  artist: string;
  cover: string;
  color: string;
  duration: number; // in seconds
}

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

const TRACKS: Track[] = [
  {
    id: 1,
    title: "Cyber Pulse",
    artist: "Synth-AI Alpha",
    cover: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=300&h=300&auto=format&fit=crop",
    color: "#00f3ff",
    duration: 184
  },
  {
    id: 2,
    title: "Midnight Drift",
    artist: "Neon Soul",
    cover: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=300&h=300&auto=format&fit=crop",
    color: "#ff00ff",
    duration: 212
  },
  {
    id: 3,
    title: "Neon Velocity",
    artist: "Digital Nomad",
    cover: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=300&h=300&auto=format&fit=crop",
    color: "#b9ff00",
    duration: 165
  }
];

// --- Snake Game Component ---
const SnakeGame: React.FC<{ onScoreUpdate: (score: number) => void }> = ({ onScoreUpdate }) => {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<string>('UP');
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [highScore, setHighScore] = useState(0);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef<string>('UP');
  const lastProcessedDirectionRef = useRef<string>('UP');

  const generateFood = useCallback(() => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Ensure food doesn't land on snake
      if (!snake.some(p => p.x === newFood.x && p.y === newFood.y)) break;
    }
    setFood(newFood);
  }, [snake]);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    directionRef.current = 'UP';
    lastProcessedDirectionRef.current = 'UP';
    setDirection('UP');
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    onScoreUpdate(0);
    generateFood();
  };

  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };
      const currentDir = directionRef.current;
      lastProcessedDirectionRef.current = currentDir;

      switch (currentDir) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Border collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setIsGameOver(true);
        return prevSnake;
      }

      // Self collision
      if (prevSnake.some(p => p.x === newHead.x && p.y === newHead.y)) {
        setIsGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        const newScore = score + 10;
        setScore(newScore);
        onScoreUpdate(newScore);
        if (newScore > highScore) setHighScore(newScore);
        generateFood();
        // Juice: Confetti on milestones
        if (newScore > 0 && newScore % 50 === 0) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00f3ff', '#ff00ff', '#b9ff00']
          });
        }
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, isGameOver, isPaused, score, highScore, generateFood, onScoreUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentDir = directionRef.current;
      const lastDir = lastProcessedDirectionRef.current;

      switch (e.key) {
        case 'ArrowUp': case 'w': 
          if (lastDir !== 'DOWN') { directionRef.current = 'UP'; setDirection('UP'); } break;
        case 'ArrowDown': case 's': 
          if (lastDir !== 'UP') { directionRef.current = 'DOWN'; setDirection('DOWN'); } break;
        case 'ArrowLeft': case 'a': 
          if (lastDir !== 'RIGHT') { directionRef.current = 'LEFT'; setDirection('LEFT'); } break;
        case 'ArrowRight': case 'd': 
          if (lastDir !== 'LEFT') { directionRef.current = 'RIGHT'; setDirection('RIGHT'); } break;
        case ' ': setIsPaused(p => !p); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const speed = Math.max(MIN_SPEED, INITIAL_SPEED - score / SPEED_INCREMENT);
    gameLoopRef.current = setInterval(moveSnake, speed);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [moveSnake, score]);

  return (
    <div className="relative group">
      {/* Game Board */}
      <div 
        className="grid bg-black/40 border-2 border-white/10 rounded-xl overflow-hidden neon-border-cyan scanlines shadow-2xl"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          width: 'min(90vw, 400px)',
          aspectRatio: '1/1'
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const isSnake = snake.some(p => p.x === x && p.y === y);
          const isHead = snake[0].x === x && snake[0].y === y;
          const isFood = food.x === x && food.y === y;

          return (
            <div 
              key={i} 
              className={`w-full h-full relative border-[0.5px] border-white/5 transition-all duration-300 ${
                isSnake ? (isHead ? 'z-10' : 'z-0') : ''
              }`}
            >
              {isSnake && (
                <motion.div 
                  layoutId={`snake-${x}-${y}`}
                  initial={false}
                  className={`w-full h-full ${isHead ? 'bg-cyan-400 shadow-[0_0_15px_#22d3ee]' : 'bg-cyan-600/60'} rounded-[2px] transition-colors`}
                />
              )}
              {isFood && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-full h-full bg-pink-500 shadow-[0_0_15px_#ec4899] rounded-full blur-[1px]"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {(isGameOver || isPaused) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 rounded-xl backdrop-blur-sm"
          >
            {isGameOver ? (
              <div className="text-center p-6 space-y-4">
                <h2 className="text-4xl font-black neon-text-pink uppercase tracking-tighter">System Failure</h2>
                <div className="space-y-1">
                  <p className="text-white/60 text-sm font-mono tracking-widest uppercase">Final Score</p>
                  <p className="text-5xl font-black text-white">{score}</p>
                </div>
                <p className="text-xs text-white/40 font-mono tracking-widest uppercase">High Score: {highScore}</p>
                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-full font-bold transition-all hover:scale-105"
                >
                  <RotateCcw className="w-4 h-4" /> REBOOT
                </button>
              </div>
            ) : (
              <div className="text-center p-6 space-y-6">
                <Gamepad2 className="w-16 h-16 mx-auto text-cyan-400 animate-pulse" />
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">PAUSED</h2>
                  <p className="text-white/60 text-xs font-mono tracking-widest leading-relaxed">
                    PRESS SPACE TO RESUME<br/>
                    WASD OR ARROWS TO MOVE
                  </p>
                </div>
                <button 
                  onClick={() => setIsPaused(false)}
                  className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all hover:scale-105"
                >
                  RESUME
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Music Player Component ---
const MusicPlayer: React.FC<{ activeScore: number }> = ({ activeScore }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const currentTrack = TRACKS[currentTrackIndex];

  // Dummy playback simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(p => (p >= 100 ? 0 : p + 0.1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setProgress(0);
  };
  
  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setProgress(0);
  };

  return (
    <div className="w-full max-w-sm glass-card rounded-2xl p-4 md:p-6 space-y-6 relative group overflow-hidden">
      {/* Visual background glow synced with track color */}
      <div 
        className="absolute inset-0 opacity-10 blur-3xl transition-colors duration-700"
        style={{ backgroundColor: currentTrack.color }}
      />

      <div className="flex items-center gap-4 relative">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
          <motion.img 
            key={currentTrack.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={currentTrack.cover} 
            alt={currentTrack.title}
            className="w-full h-full object-cover rounded-lg shadow-lg border border-white/10"
          />
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex gap-1 h-1/2 items-end">
                {[1, 2, 3, 4].map(idx => (
                  <motion.div 
                    key={idx}
                    animate={{ height: ['20%', '80%', '40%', '90%', '20%'] }}
                    transition={{ repeat: Infinity, duration: 0.5 + idx * 0.1, ease: 'easeInOut' }}
                    className="w-1 bg-white/80 rounded-full"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <motion.h3 
            key={currentTrack.title}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-lg font-bold text-white truncate"
          >
            {currentTrack.title}
          </motion.h3>
          <p className="text-white/40 text-sm font-mono tracking-wide truncate">{currentTrack.artist}</p>
        </div>
        
        <ListMusic className="w-5 h-5 text-white/20 hover:text-white/60 cursor-pointer transition-colors" />
      </div>

      <div className="space-y-2 relative">
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-300 ease-linear rounded-full"
            style={{ 
              width: `${progress}%`,
              backgroundColor: currentTrack.color,
              boxShadow: `0 0 10px ${currentTrack.color}`
            }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-white/40 uppercase tracking-widest">
          <span>0:{Math.floor((progress/100) * currentTrack.duration).toString().padStart(2, '0')}</span>
          <span>{Math.floor(currentTrack.duration / 60)}:{(currentTrack.duration % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 relative">
        <button onClick={handlePrev} className="p-2 text-white/60 hover:text-white hover:scale-110 transition-all">
          <SkipBack className="w-6 h-6" />
        </button>
        <button 
          onClick={togglePlay} 
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: isPlaying ? 'white' : 'white', color: 'black' }}
        >
          {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current ml-1" />}
        </button>
        <button onClick={handleNext} className="p-2 text-white/60 hover:text-white hover:scale-110 transition-all">
          <SkipForward className="w-6 h-6" />
        </button>
      </div>

      {/* Bonus Area: Extra HUD info */}
      <div className="pt-4 flex justify-between items-center border-t border-white/5 opacity-60">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-white/40" />
          <div className="w-16 h-1 bg-white/10 rounded-full">
            <div className="w-1/2 h-full bg-white/40 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono">BPM: 128</span>
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [currentScore, setCurrentScore] = useState(0);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 md:p-8 space-y-8 font-sans selection:bg-cyan-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150 mix-blend-overlay" />
      </div>

      {/* Header HUD */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6 z-10">
        <div className="flex flex-col items-center md:items-start">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 glass-card rounded-lg">
              <Gamepad2 className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Neon Beats</h1>
              <p className="text-xs font-mono text-cyan-400/60 uppercase tracking-widest mt-1">Arcade Sound System V.2.0</p>
            </div>
          </motion.div>
        </div>

        <div className="flex gap-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card px-6 py-2 rounded-xl flex items-center gap-3 border-r-4 border-cyan-500"
          >
            <Trophy className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase">Session Score</span>
              <span className="text-xl font-black leading-none">{currentScore}</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card px-4 py-2 rounded-xl flex items-center gap-3 border-r-4 border-pink-500"
          >
            <Music className="w-4 h-4 text-pink-400" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase">Waveform</span>
              <span className="text-xl font-black leading-none">AUTO</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Grid: Game + Control Center */}
      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8 items-start z-10">
        {/* Game Window */}
        <div className="flex flex-col items-center space-y-6">
          <SnakeGame onScoreUpdate={(s) => setCurrentScore(s)} />
          
          <div className="flex flex-wrap justify-center gap-3">
            {['W', 'A', 'S', 'D'].map(key => (
              <div 
                key={key}
                className="w-10 h-10 glass-card rounded-lg flex items-center justify-center text-xs font-black text-white/40 border-b-2 border-white/10"
              >
                {key}
              </div>
            ))}
            <div className="px-4 h-10 glass-card rounded-lg flex items-center justify-center text-[10px] font-black text-white/40 border-b-2 border-white/10 uppercase tracking-widest">
              Space: Action
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="flex flex-col gap-6">
          <MusicPlayer activeScore={currentScore} />
          
          {/* Stats / Info Board */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-mono font-bold text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">Active Modifiers</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center group">
                <span className="text-sm font-semibold text-white/80 group-hover:text-cyan-400 transition-colors">Hyper-Speed</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${currentScore > 100 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/20'}`}>
                  {currentScore > 100 ? 'ACTIVE' : 'LOCKED'}
                </span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-sm font-semibold text-white/80 group-hover:text-pink-400 transition-colors">Ghost Trail</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${currentScore > 250 ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/20'}`}>
                  {currentScore > 250 ? 'ACTIVE' : 'LOCKED'}
                </span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-sm font-semibold text-white/80 group-hover:text-lime-400 transition-colors">Sonic Blast</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${currentScore > 500 ? 'bg-lime-500/20 text-lime-400' : 'bg-white/5 text-white/20'}`}>
                  {currentScore > 500 ? 'ACTIVE' : 'LOCKED'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">Designed for AI Studio Build</p>
          </div>
        </div>
      </main>

      {/* Decorative SVG Shapes */}
      <svg className="hidden">
        <defs>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
