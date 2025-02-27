import React from 'react';
import { useGame } from '../contexts/GameContext';
import { Player } from './Player';
import { Card } from './Card';
import { GamePhase } from '../utils/types';

export const GameTable: React.FC = () => {
  const { state } = useGame();
  const { players, currentTrick, currentTurn, phase, buried } = state;

  // Position players in a circle around the table
  const getPlayerPosition = (index: number, totalPlayers: number) => {
    const positions = {
      3: ['bottom', 'top-left', 'top-right'],
      4: ['bottom', 'left', 'top', 'right'],
      5: ['bottom', 'bottom-left', 'top-left', 'top-right', 'bottom-right']
    };

    // @ts-ignore - We know we're only handling 3, 4, or 5 players
    const positionList = positions[totalPlayers] || [];
    return positionList[index] || '';
  };

  // Map position to CSS classes
  const positionClasses = {
    'bottom': 'absolute bottom-0 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'absolute bottom-10 left-10',
    'left': 'absolute top-1/2 left-0 transform -translate-y-1/2',
    'top-left': 'absolute top-10 left-10',
    'top': 'absolute top-0 left-1/2 transform -translate-x-1/2',
    'top-right': 'absolute top-10 right-10',
    'right': 'absolute top-1/2 right-0 transform -translate-y-1/2',
    'bottom-right': 'absolute bottom-10 right-10'
  };

  // Get player's position class
  const getPlayerPositionClass = (index: number) => {
    const position = getPlayerPosition(index, players.length);
    // @ts-ignore - We know the position is a valid key
    return positionClasses[position] || '';
  };

  // Render game phase indicator
  const renderPhaseIndicator = () => {
    let phaseText = '';
    let phaseColor = 'bg-gray-200';

    switch (phase) {
      case GamePhase.DEALING:
        phaseText = 'Dealing Cards';
        phaseColor = 'bg-blue-200';
        break;
      case GamePhase.PICKING:
        phaseText = 'Picking Phase';
        phaseColor = 'bg-yellow-200';
        break;
      case GamePhase.BURYING:
        phaseText = 'Burying Cards';
        phaseColor = 'bg-purple-200';
        break;
      case GamePhase.CALLING_PARTNER:
        phaseText = 'Calling Partner';
        phaseColor = 'bg-indigo-200';
        break;
      case GamePhase.PLAYING:
        phaseText = `Playing - Trick ${state.trickNumber + 1}`;
        phaseColor = 'bg-green-200';
        break;
      case GamePhase.SCORING:
        phaseText = 'Scoring';
        phaseColor = 'bg-orange-200';
        break;
      case GamePhase.GAME_OVER:
        phaseText = 'Game Over';
        phaseColor = 'bg-red-200';
        break;
    }

    return (
      <div className={`${phaseColor} px-4 py-2 rounded-full font-medium text-sm absolute top-2 left-2`}>
        {phaseText}
      </div>
    );
  };

  // Find human player (to show at bottom)
  const humanPlayerIndex = players.findIndex(p => p.isHuman);
  
  // Reorder players to put human player at the bottom
  const orderedPlayers = [...players];
  if (humanPlayerIndex !== -1) {
    const rearrangedPlayers = [...players];
    rearrangedPlayers.unshift(...rearrangedPlayers.splice(humanPlayerIndex, 1));
    // Now rearrange so human player is at index 0 (bottom position)
    for (let i = 0; i < players.length; i++) {
      orderedPlayers[(i + humanPlayerIndex) % players.length] = players[i];
    }
  }

  return (
    <div className="relative w-full h-[800px] rounded-full bg-green-800 shadow-xl">
      {renderPhaseIndicator()}

      {/* Current trick */}
      {currentTrick.length > 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-wrap gap-2 justify-center">
          {currentTrick.map((card, index) => (
            <div 
              key={`trick-${index}`} 
              className="transform"
              style={{ 
                rotate: `${(index * 30) - 60}deg`, 
                translateX: `${Math.cos((index * 30 - 60) * Math.PI / 180) * 60}px`,
                translateY: `${Math.sin((index * 30 - 60) * Math.PI / 180) * 60}px`
              }}
            >
              <Card card={card} />
            </div>
          ))}
        </div>
      )}

      {/* Blind/Buried cards */}
      {phase === GamePhase.PICKING && state.deck.length > 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-1">
          {state.deck.map((card, index) => (
            <div 
              key={`blind-${index}`} 
              className="transform rotate-6"
              style={{ marginLeft: index * -15 }}
            >
              <Card card={card} faceDown={true} />
            </div>
          ))}
          <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 text-white font-bold">
            Blind
          </div>
        </div>
      )}

      {/* Buried cards */}
      {buried.length > 0 && phase !== GamePhase.PICKING && (
        <div className="absolute top-[10%] right-[5%] flex gap-1">
          {buried.map((card, index) => (
            <div 
              key={`buried-${index}`} 
              className="transform rotate-6"
              style={{ marginLeft: index * -15 }}
            >
              <Card card={card} faceDown={phase !== GamePhase.SCORING} />
            </div>
          ))}
          <div className="absolute top-[-25px] left-1/2 transform -translate-x-1/2 text-white font-bold">
            Buried
          </div>
        </div>
      )}

      {/* Players */}
      {orderedPlayers.map((player, index) => (
        <div key={player.id} className={`${getPlayerPositionClass(index)}`}>
          <Player 
            player={player} 
            isCurrentTurn={player.id === currentTurn}
            showCards={player.isHuman || phase === GamePhase.SCORING}
          />
        </div>
      ))}
    </div>
  );
};

export default GameTable;