import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { Card } from './Card';
import { GamePhase } from '../utils/types';

export const GameControls: React.FC = () => {
  const { state, pickBlind, passBlind, buryCards } = useGame();
  const { phase, currentTurn, players } = state;

  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  
  const currentPlayer = players.find(p => p.id === currentTurn);
  const isHumanTurn = currentPlayer?.isHuman;
  
  // Only show controls for human player's turn
  if (!isHumanTurn) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg shadow">
        <p className="text-lg font-medium text-center">
          Waiting for {currentPlayer?.name || 'other players'} to make a move...
        </p>
      </div>
    );
  }

  const handlePickBlind = () => {
    if (currentPlayer) {
      pickBlind(currentPlayer.id);
    }
  };

  const handlePassBlind = () => {
    if (currentPlayer) {
      passBlind(currentPlayer.id);
    }
  };

  const handleCardSelection = (index: number) => {
    if (phase === GamePhase.BURYING) {
      setSelectedCards(prev => {
        // If already selected, remove from selection
        if (prev.includes(index)) {
          return prev.filter(i => i !== index);
        }
        
        // If already have 2 cards selected, replace the first one
        if (prev.length >= 2) {
          return [prev[1], index];
        }
        
        // Otherwise add to selection
        return [...prev, index];
      });
    }
  };

  const handleBuryCards = () => {
    if (currentPlayer && selectedCards.length === 2) {
      const cardsToBury = selectedCards.map(index => currentPlayer.cards[index]);
      buryCards(currentPlayer.id, cardsToBury);
      setSelectedCards([]);
    }
  };

  // Render different controls based on game phase
  const renderPhaseControls = () => {
    switch (phase) {
      case GamePhase.PICKING:
        return (
          <div className="flex justify-center gap-4">
            <button 
              onClick={handlePickBlind}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow"
            >
              Pick
            </button>
            <button 
              onClick={handlePassBlind}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow"
            >
              Pass
            </button>
          </div>
        );
        
      case GamePhase.BURYING:
        if (!currentPlayer?.isPicker) return null;
        
        return (
          <div className="flex flex-col items-center">
            <p className="text-lg font-medium mb-4">Select 2 cards to bury</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {currentPlayer.cards.map((card, index) => (
                <div key={`bury-${index}`} onClick={() => handleCardSelection(index)}>
                  <Card 
                    card={card} 
                    selectable={true}
                    selected={selectedCards.includes(index)}
                  />
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleBuryCards}
              disabled={selectedCards.length !== 2}
              className={`
                font-bold py-2 px-6 rounded-lg shadow
                ${selectedCards.length === 2 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed'}
              `}
            >
              Bury Selected Cards
            </button>
          </div>
        );
        
      case GamePhase.PLAYING:
        return (
          <div className="text-center">
            <p className="text-lg font-medium">Select a card to play</p>
          </div>
        );
        
      case GamePhase.SCORING:
      case GamePhase.GAME_OVER:
        const isPicker = players.find(p => p.isPicker);
        const pickerTeam = [
          isPicker, 
          players.find(p => p.id === isPicker?.partner)
        ].filter(Boolean);
        
        const defenderTeam = players.filter(
          p => !p.isPicker && p.id !== isPicker?.partner
        );
        
        const pickerTeamPoints = pickerTeam.reduce((total, player) => {
          return total + player!.tricksWon.flat().reduce((sum, card) => sum + card.value, 0);
        }, 0) + state.buried.reduce((sum, card) => sum + card.value, 0);
        
        const defenderTeamPoints = defenderTeam.reduce((total, player) => {
          return total + player.tricksWon.flat().reduce((sum, card) => sum + card.value, 0);
        }, 0);
        
        return (
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-center mb-4">Game Results</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <h3 className="font-bold text-lg">Picker Team</h3>
                <p>Points: {pickerTeamPoints}</p>
                <p>Result: {pickerTeamPoints >= 61 ? 'Win' : 'Loss'}</p>
                <p>Players: {pickerTeam.map(p => p!.name).join(', ')}</p>
              </div>
              
              <div className="bg-blue-100 p-3 rounded-lg">
                <h3 className="font-bold text-lg">Defender Team</h3>
                <p>Points: {defenderTeamPoints}</p>
                <p>Result: {defenderTeamPoints > 59 ? 'Win' : 'Loss'}</p>
                <p>Players: {defenderTeam.map(p => p.name).join(', ')}</p>
              </div>
            </div>
            
            {phase === GamePhase.GAME_OVER && (
              <div className="mt-4 text-center">
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow"
                  onClick={() => window.location.reload()}
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow">
      {renderPhaseControls()}
    </div>
  );
};

export default GameControls;