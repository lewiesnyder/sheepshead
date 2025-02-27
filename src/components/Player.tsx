import React from 'react';
import { Player as PlayerType } from '../utils/types';
import { Card } from './Card';
import { useGame } from '../contexts/GameContext';

interface PlayerProps {
  player: PlayerType;
  isCurrentTurn: boolean;
  showCards?: boolean;
}

export const Player: React.FC<PlayerProps> = ({
  player,
  isCurrentTurn,
  showCards = false
}) => {
  const { state, playCard, isValidCardPlay } = useGame();
  const isHumanPlayer = player.isHuman;
  const canPlayCard = isCurrentTurn && isHumanPlayer && state.phase === 'PLAYING';

  const handleCardClick = (cardIndex: number) => {
    if (canPlayCard && isValidCardPlay(player.id, player.cards[cardIndex])) {
      playCard(player.id, player.cards[cardIndex]);
    }
  };

  return (
    <div className={`
      flex flex-col items-center p-4 rounded-lg
      ${isCurrentTurn ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}
    `}>
      {/* Player avatar */}
      <div className="relative mb-2">
        <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
          {player.avatar ? (
            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold">{player.name.charAt(0)}</span>
          )}
        </div>
        {player.isDealer && (
          <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
            Dealer
          </div>
        )}
        {player.isPicker && (
          <div className="absolute -top-1 -left-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
            Picker
          </div>
        )}
      </div>
      
      {/* Player name */}
      <div className="font-bold text-lg mb-1">{player.name}</div>
      
      {/* Player score */}
      <div className="text-sm mb-3">Score: {player.score}</div>
      
      {/* Player cards */}
      <div className="flex flex-wrap justify-center gap-1">
        {player.cards.map((card, index) => (
          <div key={`${card.suit}-${card.rank}`} className="transform -rotate-12">
            <Card 
              card={card} 
              faceDown={!showCards && !isHumanPlayer}
              selectable={canPlayCard && isValidCardPlay(player.id, card)}
              onClick={() => handleCardClick(index)}
            />
          </div>
        ))}
      </div>
      
      {/* Tricks won */}
      {player.tricksWon.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-medium text-gray-600">Tricks: {player.tricksWon.length}</div>
          <div className="text-sm font-medium text-gray-600">
            Points: {player.tricksWon.flat().reduce((sum, card) => sum + card.value, 0)}
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;