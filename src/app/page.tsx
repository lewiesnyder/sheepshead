"use client";

import React, { useState } from 'react';
import { GameProvider, useGame } from '../contexts/GameContext';
import { GameTable } from '../components/GameTable';
import { GameControls } from '../components/GameControls';
import { Player } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';

interface SetupScreenProps {
  onStartGame: (players: Omit<Player, 'cards' | 'score' | 'isDealer' | 'tricksWon'>[]) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame }) => {
  const [playerCount, setPlayerCount] = useState<number>(5);
  const [playerName, setPlayerName] = useState<string>('You');
  
  const handleStartGame = () => {
    // Create players array with 1 human and the rest AI
    const players: Omit<Player, 'cards' | 'score' | 'isDealer' | 'tricksWon'>[] = [
      {
        id: 'human-player',
        name: playerName || 'You',
        isHuman: true
      }
    ];
    
    // Add AI players
    for (let i = 1; i < playerCount; i++) {
      players.push({
        id: `ai-player-${i}`,
        name: `AI Player ${i}`,
        isHuman: false
      });
    }
    
    onStartGame(players);
  };
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
      <h1 className="text-3xl font-bold text-center mb-6">Sheepshead</h1>
      
      <div className="mb-6">
        <label className="block mb-2 font-medium">Your Name</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="mb-8">
        <label className="block mb-2 font-medium">Number of Players</label>
        <select
          value={playerCount}
          onChange={(e) => setPlayerCount(Number(e.target.value))}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={3}>3 Players</option>
          <option value={4}>4 Players</option>
          <option value={5}>5 Players</option>
        </select>
      </div>
      
      <button
        onClick={handleStartGame}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Start Game
      </button>
    </div>
  );
};

const GameScreen: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <GameTable />
      </div>
      <div className="mt-6">
        <GameControls />
      </div>
    </div>
  );
};

const GameContainer: React.FC = () => {
  const { state, startGame } = useGame();
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  
  const handleStartGame = (players: Omit<Player, 'cards' | 'score' | 'isDealer' | 'tricksWon'>[]) => {
    startGame(players);
    setGameStarted(true);
  };
  
  // Check if there's an ongoing game saved
  if (state.phase !== 'GAME_OVER' && state.players.length > 0 && !gameStarted) {
    setGameStarted(true);
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {!gameStarted ? (
        <SetupScreen onStartGame={handleStartGame} />
      ) : (
        <GameScreen />
      )}
    </div>
  );
};

export default function Page() {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
}
