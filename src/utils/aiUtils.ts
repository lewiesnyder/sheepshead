import { Card, Suit, Rank, Player, GameState, GamePhase } from './types';
import { isCardTrump, getCardPower, calculatePoints, isValidPlay } from './gameUtils';

/**
 * Evaluates the strength of a hand for picking
 * @param cards The player's cards
 * @returns A score representing hand strength
 */
const evaluateHandStrength = (cards: Card[]): number => {
  let score = 0;
  
  // Count trump cards
  const trumpCards = cards.filter(card => card.isTrump);
  score += trumpCards.length * 3;
  
  // Bonus for high-powered trump cards
  trumpCards.forEach(card => {
    const power = getCardPower(card);
    if (power > 27) { // Queen
      score += 5;
    } else if (power > 23) { // Jack
      score += 3;
    } else if (power > 18) { // Diamond face cards
      score += 1;
    }
  });
  
  // Count point cards (Aces and Tens)
  cards.forEach(card => {
    if (card.rank === Rank.ACE && !card.isTrump) {
      score += 2;
    } else if (card.rank === Rank.TEN && !card.isTrump) {
      score += 1;
    }
  });
  
  // Penalty for unbalanced suits (vulnerable to being forced)
  const suitCounts = {
    [Suit.CLUBS]: 0,
    [Suit.SPADES]: 0,
    [Suit.HEARTS]: 0,
  };
  
  cards.forEach(card => {
    if (!card.isTrump && Object.keys(suitCounts).includes(card.suit)) {
      suitCounts[card.suit as keyof typeof suitCounts]++;
    }
  });
  
  // Penalty for having exactly 1 card in a suit
  Object.values(suitCounts).forEach(count => {
    if (count === 1) {
      score -= 2;
    }
  });
  
  return score;
};

/**
 * Decides whether the AI should pick up the blind
 * @param player The AI player
 * @param gameState Current game state
 * @returns True if the AI decides to pick, false otherwise
 */
export const shouldPickBlind = (player: Player, gameState: GameState): boolean => {
  const handStrength = evaluateHandStrength(player.cards);
  
  // Base decision on hand strength - thresholds can be adjusted
  if (gameState.players.length === 3) {
    // In 3-player game, be more aggressive with picking
    return handStrength >= 10;
  } else if (gameState.players.length === 5) {
    // In 5-player game, be more conservative
    return handStrength >= 14;
  }
  
  return handStrength >= 12; // Default threshold
};

/**
 * Decides which cards to bury for the AI
 * @param player The AI player
 * @param blind The blind cards
 * @returns An array of two cards to bury
 */
export const chooseBuryCards = (player: Player, blind: Card[]): Card[] => {
  // Combine player's cards with the blind
  const allCards = [...player.cards, ...blind];
  
  // Sort cards by power (lowest to highest)
  const sortedCards = [...allCards].sort((a, b) => {
    // Prioritize keeping trump
    if (a.isTrump && !b.isTrump) return 1;
    if (!a.isTrump && b.isTrump) return -1;
    
    // For non-trump, prefer to bury low point cards
    if (!a.isTrump && !b.isTrump) {
      return a.value - b.value;
    }
    
    // For trump, prefer to keep high-powered cards
    return getCardPower(a) - getCardPower(b);
  });
  
  // Choose the lowest-value cards to bury
  // But avoid burying point cards if possible
  const candidatesToBury = sortedCards.slice(0, 4);
  
  // Prefer to bury cards with 0 points if available
  const zeroPointCards = candidatesToBury.filter(card => card.value === 0);
  
  if (zeroPointCards.length >= 2) {
    return zeroPointCards.slice(0, 2);
  }
  
  // Otherwise, just bury the lowest value cards
  return candidatesToBury.slice(0, 2);
};

/**
 * Decide which card to play in the current trick
 * @param player The AI player
 * @param gameState Current game state
 * @returns The card the AI chooses to play
 */
export const chooseCardToPlay = (player: Player, gameState: GameState): Card => {
  const { currentTrick, leadSuit } = gameState;
  const validPlays = player.cards.filter(card => 
    isValidPlay(card, player, currentTrick, leadSuit)
  );
  
  // If only one valid play, return it
  if (validPlays.length === 1) {
    return validPlays[0];
  }
  
  // If leading the trick, use lead strategy
  if (currentTrick.length === 0) {
    return chooseLeadCard(player, validPlays, gameState);
  }
  
  // If playing in the trick, optimize play based on role
  return chooseFollowCard(player, validPlays, gameState);
};

/**
 * Choose a card to lead a trick
 * @param player The AI player 
 * @param validPlays Valid cards to play
 * @param gameState Current game state
 * @returns The card the AI chooses to lead
 */
const chooseLeadCard = (player: Player, validPlays: Card[], gameState: GameState): Card => {
  const isPicker = player.isPicker;
  const isPartner = player.id === gameState.players.find(p => p.isPicker)?.partner;
  
  // If picker or partner, lead with stronger strategy
  if (isPicker || isPartner) {
    // Lead with strong trump if we have it
    const strongTrump = validPlays
      .filter(card => card.isTrump)
      .sort((a, b) => getCardPower(b) - getCardPower(a))[0];
      
    if (strongTrump && getCardPower(strongTrump) > 25) {
      return strongTrump;
    }
    
    // Lead with an Ace if available
    const aces = validPlays.filter(card => !card.isTrump && card.rank === Rank.ACE);
    if (aces.length > 0) {
      return aces[0];
    }
    
    // Lead with a ten if available
    const tens = validPlays.filter(card => !card.isTrump && card.rank === Rank.TEN);
    if (tens.length > 0) {
      return tens[0];
    }
  } else {
    // Defenders' lead strategy
    // Look for singleton suits to potentially cut
    const suitCounts = {
      [Suit.CLUBS]: { count: 0, cards: [] as Card[] },
      [Suit.SPADES]: { count: 0, cards: [] as Card[] },
      [Suit.HEARTS]: { count: 0, cards: [] as Card[] },
    };
    
    validPlays.forEach(card => {
      if (!card.isTrump && Object.keys(suitCounts).includes(card.suit)) {
        suitCounts[card.suit as keyof typeof suitCounts].count++;
        suitCounts[card.suit as keyof typeof suitCounts].cards.push(card);
      }
    });
    
    // Find singleton suits
    for (const suit of Object.keys(suitCounts) as Suit[]) {
      if (suitCounts[suit].count === 1) {
        return suitCounts[suit].cards[0];
      }
    }
    
    // Lead with a low card if available
    const lowCards = validPlays
      .filter(card => !card.isTrump && card.value === 0)
      .sort((a, b) => getCardPower(a) - getCardPower(b));
      
    if (lowCards.length > 0) {
      return lowCards[0];
    }
  }
  
  // Default: play lowest power card
  return validPlays.sort((a, b) => getCardPower(a) - getCardPower(b))[0];
};

/**
 * Choose a card to follow in a trick
 * @param player The AI player
 * @param validPlays Valid cards to play
 * @param gameState Current game state
 * @returns The card the AI chooses to play
 */
const chooseFollowCard = (player: Player, validPlays: Card[], gameState: GameState): Card => {
  const { currentTrick, leadSuit } = gameState;
  const isPicker = player.isPicker;
  const isPartner = player.id === gameState.players.find(p => p.isPicker)?.partner;
  
  // Calculate the current highest card in the trick
  let highestCard = currentTrick[0];
  for (let i = 1; i < currentTrick.length; i++) {
    const card = currentTrick[i];
    
    if ((card.isTrump && !highestCard.isTrump) || 
        (card.isTrump && highestCard.isTrump && getCardPower(card) > getCardPower(highestCard)) ||
        (!card.isTrump && !highestCard.isTrump && card.suit === leadSuit && 
         getCardPower(card) > getCardPower(highestCard))) {
      highestCard = card;
    }
  }
  
  // Check if our teammate played the highest card
  const isTeamWinning = isPlayerOnSameTeam(
    gameState.players[currentTrick.indexOf(highestCard)],
    player,
    gameState
  );
  
  if (isTeamWinning) {
    // If our team is winning, play the lowest value card
    const lowValueCards = validPlays.sort((a, b) => a.value - b.value);
    return lowValueCards[0];
  } else {
    // Try to win the trick if valuable
    const trickValue = calculatePoints([...currentTrick]);
    const canWin = validPlays.some(card => 
      (card.isTrump && !highestCard.isTrump) ||
      (card.isTrump && highestCard.isTrump && getCardPower(card) > getCardPower(highestCard)) ||
      (!card.isTrump && !highestCard.isTrump && card.suit === leadSuit && 
       getCardPower(card) > getCardPower(highestCard))
    );
    
    // If we're the picker/partner or the trick has high value, try to win it
    if ((isPicker || isPartner || trickValue >= 10) && canWin) {
      // Find the lowest card that can win
      const winningCards = validPlays.filter(card => 
        (card.isTrump && !highestCard.isTrump) ||
        (card.isTrump && highestCard.isTrump && getCardPower(card) > getCardPower(highestCard)) ||
        (!card.isTrump && !highestCard.isTrump && card.suit === leadSuit && 
         getCardPower(card) > getCardPower(highestCard))
      ).sort((a, b) => getCardPower(a) - getCardPower(b));
      
      return winningCards[0];
    } else {
      // If we can't win or shouldn't try, play the lowest value card
      return validPlays.sort((a, b) => a.value - b.value)[0];
    }
  }
};

/**
 * Check if two players are on the same team
 * @param player1 First player
 * @param player2 Second player
 * @param gameState Current game state
 * @returns True if players are on the same team
 */
const isPlayerOnSameTeam = (player1: Player, player2: Player, gameState: GameState): boolean => {
  const picker = gameState.players.find(p => p.isPicker);
  
  if (!picker) return false;
  
  // Same team if both are picker/partner or both are defenders
  return (
    (player1.isPicker || player1.id === picker.partner) && 
    (player2.isPicker || player2.id === picker.partner)
  ) || (
    !player1.isPicker && player1.id !== picker.partner &&
    !player2.isPicker && player2.id !== picker.partner
  );
};