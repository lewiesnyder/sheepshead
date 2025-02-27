import React from 'react';
import { Card as CardType, Suit, Rank } from '../utils/types';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  faceDown?: boolean;
}

export const Card: React.FC<CardProps> = ({
  card,
  onClick,
  selectable = false,
  selected = false,
  faceDown = false
}) => {
  const getSuitSymbol = (suit: Suit) => {
    switch (suit) {
      case Suit.CLUBS: return '♣';
      case Suit.SPADES: return '♠';
      case Suit.HEARTS: return '♥';
      case Suit.DIAMONDS: return '♦';
      default: return '';
    }
  };

  const getSuitColor = (suit: Suit) => {
    return suit === Suit.HEARTS || suit === Suit.DIAMONDS ? 'text-red-600' : 'text-black';
  };

  const getRankDisplay = (rank: Rank) => {
    switch (rank) {
      case Rank.JACK: return 'J';
      case Rank.QUEEN: return 'Q';
      case Rank.KING: return 'K';
      case Rank.ACE: return 'A';
      default: return rank;
    }
  };

  return (
    <div 
      className={`
        relative w-20 h-32 rounded-md shadow-md 
        ${faceDown ? 'bg-blue-800' : 'bg-white'} 
        ${selectable ? 'cursor-pointer hover:shadow-lg transform hover:-translate-y-1 transition-transform' : ''}
        ${selected ? 'border-2 border-blue-500 transform -translate-y-4' : ''}
      `}
      onClick={selectable ? onClick : undefined}
    >
      {!faceDown && (
        <>
          <div className={`absolute top-1 left-2 text-lg font-bold ${getSuitColor(card.suit)}`}>
            {getRankDisplay(card.rank)}
          </div>
          <div className={`absolute bottom-1 right-2 text-lg font-bold ${getSuitColor(card.suit)}`}>
            {getRankDisplay(card.rank)}
          </div>
          <div className={`absolute inset-0 flex items-center justify-center text-4xl ${getSuitColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
          {card.isTrump && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 font-semibold bg-white/60 px-1 rounded">
              TRUMP
            </div>
          )}
          <div className="absolute bottom-8 right-2 text-xs">
            {card.value > 0 ? `(${card.value})` : ''}
          </div>
        </>
      )}
    </div>
  );
};

export default Card;