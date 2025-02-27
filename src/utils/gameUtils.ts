import { Card, Suit, Rank, Player, GameState } from './types';

/**
 * Initialize a standard 32-card Sheepshead deck
 * @returns An array of Card objects
 */
export const initializeDeck = (): Card[] => {
  const deck: Card[] = [];
  
  // In Sheepshead, only 7-Ace cards are used (32 cards total)
  Object.values(Suit).forEach(suit => {
    Object.values(Rank).forEach(rank => {
      const card: Card = {
        suit,
        rank,
        value: getCardValue(rank, suit),
        isTrump: isCardTrump(rank, suit)
      };
      deck.push(card);
    });
  });
  
  return shuffle(deck);
};

/**
 * Shuffle an array of cards
 * @param deck The deck to shuffle
 * @returns A shuffled array of cards
 */
const shuffle = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

/**
 * Deal cards to players
 * @param deck The deck to deal from
 * @param players The players to deal to
 * @returns Object containing the updated players and the remaining deck (for the blind)
 */
export const dealCards = (deck: Card[], players: Player[]): { players: Player[], blind: Card[] } => {
  const updatedPlayers = [...players];
  const numPlayers = players.length;
  
  // Standard Sheepshead dealing pattern:
  // - Deal 6 cards to each player if 5 players
  // - Deal 10 cards to each player if 3 players
  const cardsPerPlayer = numPlayers === 5 ? 6 : 10;
  
  // Deal cards in rotation (2 cards at a time is traditional)
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numPlayers; p++) {
      // Get next player (starting with the player after the dealer)
      const playerIndex = (players.findIndex(player => player.isDealer) + 1 + p) % numPlayers;
      
      if (deck.length > 0) {
        updatedPlayers[playerIndex].cards.push(deck.shift()!);
      }
    }
  }
  
  // Return updated players and the remaining cards (blind)
  return {
    players: updatedPlayers,
    blind: deck
  };
};

/**
 * Determine if a card is trump
 * @param rank Card rank
 * @param suit Card suit
 * @returns True if the card is trump, false otherwise
 */
export const isCardTrump = (rank: Rank, suit: Suit): boolean => {
  // In Sheepshead:
  // 1. All Queens and Jacks are trump
  // 2. All Diamonds are trump
  return rank === Rank.QUEEN || rank === Rank.JACK || suit === Suit.DIAMONDS;
};

/**
 * Get the value of a card (points)
 * @param rank Card rank
 * @param suit Card suit
 * @returns The card's point value
 */
export const getCardValue = (rank: Rank, suit: Suit): number => {
  // Point values in Sheepshead
  switch (rank) {
    case Rank.ACE:
      return 11;
    case Rank.TEN:
      return 10;
    case Rank.KING:
      return 4;
    case Rank.QUEEN:
      return 3;
    case Rank.JACK:
      return 2;
    default:
      return 0; // 7, 8, 9 are worth 0 points
  }
};

/**
 * Get the rank of a card for determining trick winner
 * @param card The card to evaluate
 * @returns A number representing the card's rank (higher is stronger)
 */
export const getCardPower = (card: Card): number => {
  // Trump card ranking (highest to lowest):
  // Queen of Clubs, Queen of Spades, Queen of Hearts, Queen of Diamonds
  // Jack of Clubs, Jack of Spades, Jack of Hearts, Jack of Diamonds
  // Ace of Diamonds, Ten of Diamonds, King of Diamonds, etc.
  
  if (card.isTrump) {
    if (card.rank === Rank.QUEEN) {
      switch (card.suit) {
        case Suit.CLUBS: return 31;
        case Suit.SPADES: return 30;
        case Suit.HEARTS: return 29;
        case Suit.DIAMONDS: return 28;
      }
    }
    
    if (card.rank === Rank.JACK) {
      switch (card.suit) {
        case Suit.CLUBS: return 27;
        case Suit.SPADES: return 26;
        case Suit.HEARTS: return 25;
        case Suit.DIAMONDS: return 24;
      }
    }
    
    // Diamond suit trump cards (aside from Queen/Jack)
    if (card.suit === Suit.DIAMONDS) {
      switch (card.rank) {
        case Rank.ACE: return 23;
        case Rank.TEN: return 22;
        case Rank.KING: return 21;
        case Rank.NINE: return 20;
        case Rank.EIGHT: return 19;
        case Rank.SEVEN: return 18;
      }
    }
  } else {
    // Non-trump ranking
    switch (card.rank) {
      case Rank.ACE: return 7;
      case Rank.TEN: return 6;
      case Rank.KING: return 5;
      case Rank.NINE: return 2;
      case Rank.EIGHT: return 1;
      case Rank.SEVEN: return 0;
    }
  }
  
  return 0;
};

/**
 * Determine the winner of a trick
 * @param trick The cards played in the trick
 * @param leadSuit The suit led in the trick
 * @param players The players who played the cards
 * @returns The ID of the player who won the trick
 */
export const determineTrickWinner = (trick: Card[], leadSuit: Suit, players: Player[]): string => {
  if (trick.length === 0) return '';
  
  let winningCard = trick[0];
  let winningIndex = 0;
  
  for (let i = 1; i < trick.length; i++) {
    const card = trick[i];
    
    // Trump beats non-trump
    if (card.isTrump && !winningCard.isTrump) {
      winningCard = card;
      winningIndex = i;
    } 
    // Higher trump beats lower trump
    else if (card.isTrump && winningCard.isTrump && getCardPower(card) > getCardPower(winningCard)) {
      winningCard = card;
      winningIndex = i;
    }
    // Non-trump: must follow suit and higher rank wins
    else if (!card.isTrump && !winningCard.isTrump && card.suit === leadSuit && 
             getCardPower(card) > getCardPower(winningCard)) {
      winningCard = card;
      winningIndex = i;
    }
  }
  
  // Find which player played the winning card
  // We need to calculate the player index based on who led the trick
  const startPlayerIndex = players.findIndex(p => p.id === players[winningIndex].id);
  const winnerIndex = (startPlayerIndex + winningIndex) % players.length;
  
  return players[winnerIndex].id;
};

/**
 * Calculate total points in a set of cards
 * @param cards Array of cards to calculate points for
 * @returns Total point value
 */
export const calculatePoints = (cards: Card[]): number => {
  return cards.reduce((total, card) => total + card.value, 0);
};

/**
 * Calculate the final score after all tricks are played
 * @param gameState Current game state
 * @returns Object containing team scores and game result
 */
export const calculateGameScore = (gameState: GameState): {
  pickerTeamScore: number,
  defenderTeamScore: number,
  isPicKerTeamWinner: boolean,
  pointsWon: number
} => {
  const pickerTeam: Player[] = [];
  const defenderTeam: Player[] = [];
  
  // Identify teams
  gameState.players.forEach(player => {
    if (player.isPicker || player.id === gameState.players.find(p => p.isPicker)?.partner) {
      pickerTeam.push(player);
    } else {
      defenderTeam.push(player);
    }
  });
  
  // Calculate team points
  let pickerTeamScore = 0;
  let defenderTeamScore = 0;
  
  // Sum points from tricks won
  pickerTeam.forEach(player => {
    player.tricksWon.forEach(trick => {
      pickerTeamScore += calculatePoints(trick);
    });
  });
  
  defenderTeam.forEach(player => {
    player.tricksWon.forEach(trick => {
      defenderTeamScore += calculatePoints(trick);
    });
  });
  
  // In Sheepshead, total points should be 120
  const totalPoints = pickerTeamScore + defenderTeamScore;
  
  // Add points from the buried cards to picker team's score
  if (gameState.buried.length > 0) {
    pickerTeamScore += calculatePoints(gameState.buried);
  }
  
  // Determine winner - picker team needs 61+ points to win
  const isPicKerTeamWinner = pickerTeamScore >= 61;
  const pointsWon = isPicKerTeamWinner ? pickerTeamScore : defenderTeamScore;
  
  return {
    pickerTeamScore,
    defenderTeamScore,
    isPicKerTeamWinner,
    pointsWon
  };
};

/**
 * Check if a player is allowed to play a card
 * @param card The card being played
 * @param player The player playing the card
 * @param trick The current trick
 * @param leadSuit The suit led in the trick
 * @returns True if the play is valid, false otherwise
 */
export const isValidPlay = (card: Card, player: Player, trick: Card[], leadSuit?: Suit): boolean => {
  // First card of the trick can be anything
  if (trick.length === 0) {
    return true;
  }
  
  // Must follow suit if possible
  if (leadSuit && !card.isTrump) {
    const hasSuit = player.cards.some(c => !c.isTrump && c.suit === leadSuit);
    if (hasSuit && card.suit !== leadSuit) {
      return false;
    }
  }
  
  // Must play trump if you can't follow suit and have trump
  if (leadSuit && trick[0].isTrump && !card.isTrump) {
    const hasTrump = player.cards.some(c => c.isTrump);
    if (hasTrump) {
      return false;
    }
  }
  
  return true;
};