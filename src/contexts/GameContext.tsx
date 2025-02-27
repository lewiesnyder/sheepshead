import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Card, Suit, Player, GameState, GamePhase, GameEvent
} from '../utils/types';
import {
  initializeDeck, dealCards, isCardTrump, getCardValue, getCardPower,
  determineTrickWinner, calculatePoints, calculateGameScore, isValidPlay
} from '../utils/gameUtils';
import {
  shouldPickBlind, chooseBuryCards, chooseCardToPlay
} from '../utils/aiUtils';
import {
  saveGameState, loadGameState
} from '../utils/storageUtils';

// Define action types
type ActionType = 
  | { type: 'START_GAME'; players: Omit<Player, 'cards' | 'score' | 'isDealer' | 'tricksWon'>[] }
  | { type: 'PICK_BLIND'; playerId: string }
  | { type: 'PASS_BLIND'; playerId: string }
  | { type: 'BURY_CARDS'; playerId: string; cards: Card[] }
  | { type: 'CALL_PARTNER'; playerId: string; partnerId: string }
  | { type: 'PLAY_CARD'; playerId: string; card: Card }
  | { type: 'NEXT_PLAYER' }
  | { type: 'END_TRICK' }
  | { type: 'END_ROUND' }
  | { type: 'END_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'LOAD_GAME'; gameState: GameState };

// Define initial state
const initialState: GameState = {
  gameId: '',
  players: [],
  currentTurn: '',
  phase: GamePhase.GAME_OVER,
  deck: [],
  buried: [],
  currentTrick: [],
  roundNumber: 0,
  trickNumber: 0,
  isLeaster: false,
  isDoubler: false,
  isReDoubler: false,
  log: []
};

// Create context
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<ActionType>;
  startGame: (players: Omit<Player, 'cards' | 'score' | 'isDealer' | 'tricksWon'>[]) => void;
  pickBlind: (playerId: string) => void;
  passBlind: (playerId: string) => void;
  buryCards: (playerId: string, cards: Card[]) => void;
  callPartner: (playerId: string, partnerId: string) => void;
  playCard: (playerId: string, card: Card) => void;
  isValidCardPlay: (playerId: string, card: Card) => boolean;
  handleAITurn: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Reducer function
function gameReducer(state: GameState, action: ActionType): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const gameId = uuidv4();
      const deck = initializeDeck();
      
      // Initialize players with cards and scores
      const initializedPlayers = action.players.map((player, index) => ({
        ...player,
        cards: [],
        score: 0,
        isDealer: index === 0, // First player is dealer
        tricksWon: []
      }));
      
      // Deal cards to players
      const { players, blind } = dealCards(deck, initializedPlayers);
      
      // Start with player after dealer
      const startingPlayerIndex = (players.findIndex(p => p.isDealer) + 1) % players.length;
      const currentTurn = players[startingPlayerIndex].id;
      
      const newState = {
        ...state,
        gameId,
        players,
        currentTurn,
        phase: GamePhase.PICKING,
        deck: blind, // Remaining cards become the blind
        buried: [],
        currentTrick: [],
        roundNumber: 1,
        trickNumber: 0,
        isLeaster: false,
        isDoubler: false,
        isReDoubler: false,
        log: [{
          type: 'GAME_STARTED',
          playerId: '',
          timestamp: Date.now(),
          data: { gameId }
        }]
      };
      
      saveGameState(newState);
      return newState;
    }
    
    case 'PICK_BLIND': {
      const { playerId } = action;
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      
      if (playerIndex === -1 || state.phase !== GamePhase.PICKING) {
        return state;
      }
      
      // Update player as picker and add blind cards to their hand
      const updatedPlayers = state.players.map((player, idx) => {
        if (idx === playerIndex) {
          return {
            ...player,
            isPicker: true,
            cards: [...player.cards, ...state.deck]
          };
        }
        return player;
      });
      
      const newState = {
        ...state,
        players: updatedPlayers,
        deck: [],
        phase: GamePhase.BURYING,
        log: [
          ...state.log,
          {
            type: 'PICKED_BLIND',
            playerId,
            timestamp: Date.now()
          }
        ]
      };
      
      saveGameState(newState);
      return newState;
    }
    
    case 'PASS_BLIND': {
      const { playerId } = action;
      
      if (state.phase !== GamePhase.PICKING) {
        return state;
      }
      
      // Find the next player to offer the blind
      const currentPlayerIndex = state.players.findIndex(p => p.id === playerId);
      const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length;
      const nextPlayer = state.players[nextPlayerIndex];
      
      // Check if all players have passed
      const isLastPlayer = nextPlayerIndex === state.players.findIndex(p => p.isDealer);
      
      if (isLastPlayer) {
        // All players passed - go to leaster
        const newState = {
          ...state,
          currentTurn: nextPlayer.id,
          phase: GamePhase.PLAYING,
          isLeaster: true,
          log: [
            ...state.log,
            {
              type: 'ALL_PASSED',
              playerId: playerId,
              timestamp: Date.now(),
              data: { isLeaster: true }
            }
          ]
        };
        
        saveGameState(newState);
        return newState;
      }
      
      const newState = {
        ...state,
        currentTurn: nextPlayer.id,
        log: [
          ...state.log,
          {
            type: 'PASSED_BLIND',
            playerId,
            timestamp: Date.now()
          }
        ]
      };
      
      saveGameState(newState);
      return newState;
    }
    
    case 'BURY_CARDS': {
      const { playerId, cards } = action;
      
      if (state.phase !== GamePhase.BURYING || cards.length !== 2) {
        return state;
      }
      
      // Find the picker
      const pickerIndex = state.players.findIndex(p => p.id === playerId && p.isPicker);
      
      if (pickerIndex === -1) {
        return state;
      }
      
      // Remove buried cards from picker's hand and add to buried pile
      const pickerCards = [...state.players[pickerIndex].cards];
      const remainingCards = pickerCards.filter(
        card => !cards.some(c => c.suit === card.suit && c.rank === card.rank)
      );
      
      const updatedPlayers = state.players.map((player, idx) => {
        if (idx === pickerIndex) {
          return {
            ...player,
            cards: remainingCards
          };
        }
        return player;
      });
      
      // In 5-player game, we may need to call a partner
      const shouldCallPartner = updatedPlayers.length === 5;
      
      const newState = {
        ...state,
        players: updatedPlayers,
        buried: cards,
        phase: shouldCallPartner ? GamePhase.CALLING_PARTNER : GamePhase.PLAYING,
        log: [
          ...state.log,
          {
            type: 'BURIED_CARDS',
            playerId,
            timestamp: Date.now(),
            data: { cards }
          }
        ]
      };
      
      saveGameState(newState);
      return newState;
    }
    
    case 'CALL_PARTNER': {
      const { playerId, partnerId } = action;
      
      if (state.phase !== GamePhase.CALLING_PARTNER) {
        return state;
      }
      
      // Find the picker
      const pickerIndex = state.players.findIndex(p => p.isPicker);
      
      if (pickerIndex === -1 || state.players[pickerIndex].id !== playerId) {
        return state;
      }
      
      // Update picker with chosen partner
      const updatedPlayers = state.players.map((player, idx) => {
        if (idx === pickerIndex) {
          return {
            ...player,
            partner: partnerId
          };
        }
        return player;
      });
      
      const newState = {
        ...state,
        players: updatedPlayers,
        phase: GamePhase.PLAYING,
        log: [
          ...state.log,
          {
            type: 'CALLED_PARTNER',
            playerId,
            timestamp: Date.now(),
            data: { partnerId }
          }
        ]
      };
      
      saveGameState(newState);
      return newState;
    }
    
    case 'PLAY_CARD': {
      const { playerId, card } = action;
      
      if (state.phase !== GamePhase.PLAYING || state.currentTurn !== playerId) {
        return state;
      }
      
      // Find the player
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      
      if (playerIndex === -1) {
        return state;
      }
      
      // Check if the play is valid
      const player = state.players[playerIndex];
      if (!isValidPlay(card, player, state.currentTrick, state.leadSuit)) {
        return state;
      }
      
      // Remove card from player's hand
      const updatedPlayers = state.players.map((p, idx) => {
        if (idx === playerIndex) {
          return {
            ...p,
            cards: p.cards.filter(c => !(c.suit === card.suit && c.rank === card.rank))
          };
        }
        return p;
      });
      
      // Add card to current trick
      const updatedTrick = [...state.currentTrick, card];
      
      // Set lead suit if this is the first card
      const updatedLeadSuit = state.currentTrick.length === 0 && !card.isTrump
        ? card.suit
        : state.leadSuit;
      
      // Determine next player
      const nextPlayerIndex = (playerIndex + 1) % state.players.length;
      
      const newState = {
        ...state,
        players: updatedPlayers,
        currentTrick: updatedTrick,
        currentTurn: state.players[nextPlayerIndex].id,
        leadSuit: updatedLeadSuit,
        log: [
          ...state.log,
          {
            type: 'PLAYED_CARD',
            playerId,
            timestamp: Date.now(),
            data: { card }
          }
        ]
      };
      
      saveGameState(newState);
      
      // If all players have played a card, end the trick
      if (updatedTrick.length === state.players.length) {
        return gameReducer(newState, { type: 'END_TRICK' });
      }
      
      return newState;
    }
    
    case 'END_TRICK': {
      if (state.currentTrick.length !== state.players.length) {
        return state;
      }
      
      // Determine trick winner
      const winnerId = determineTrickWinner(
        state.currentTrick,
        state.leadSuit || Suit.CLUBS, // Fallback to CLUBS if no lead suit
        state.players
      );
      
      // Update winner's tricks
      const updatedPlayers = state.players.map(player => {
        if (player.id === winnerId) {
          return {
            ...player,
            tricksWon: [...player.tricksWon, [...state.currentTrick]]
          };
        }
        return player;
      });
      
      const newTrickNumber = state.trickNumber + 1;
      const isHandComplete = updatedPlayers[0].cards.length === 0;
      
      const newState = {
        ...state,
        players: updatedPlayers,
        currentTrick: [],
        leadSuit: undefined,
        currentTurn: winnerId,
        trickNumber: newTrickNumber,
        log: [
          ...state.log,
          {
            type: 'TRICK_COMPLETED',
            playerId: winnerId,
            timestamp: Date.now(),
            data: { trickNumber: state.trickNumber + 1 }
          }
        ]
      };
      
      saveGameState(newState);
      
      // If the hand is complete, end the round
      if (isHandComplete) {
        return gameReducer(newState, { type: 'END_ROUND' });
      }
      
      return newState;
    }
    
    case 'END_ROUND': {
      // Calculate scores
      const { pickerTeamScore, defenderTeamScore, isPicKerTeamWinner } = 
        calculateGameScore(state);
      
      // Update player scores
      const picker = state.players.find(p => p.isPicker);
      const updatedPlayers = state.players.map(player => {
        // In a normal game
        if (!state.isLeaster && picker) {
          const isPickerTeam = player.isPicker || player.id === picker.partner;
          
          if ((isPickerTeam && isPicKerTeamWinner) || (!isPickerTeam && !isPicKerTeamWinner)) {
            // Winner gets the points
            return {
              ...player,
              score: player.score + (isPickerTeam ? pickerTeamScore : defenderTeamScore)
            };
          }
        }
        // In a leaster, highest point getter wins
        else if (state.isLeaster) {
          let maxPoints = 0;
          let leasterWinnerId = '';
          
          state.players.forEach(p => {
            const playerPoints = p.tricksWon.reduce(
              (total, trick) => total + calculatePoints(trick),
              0
            );
            if (playerPoints > maxPoints) {
              maxPoints = playerPoints;
              leasterWinnerId = p.id;
            }
          });
          
          if (player.id === leasterWinnerId) {
            return {
              ...player,
              score: player.score + maxPoints
            };
          }
        }
        return player;
      });
      
      // Rotate dealer for next round
      const newDealerIndex = (state.players.findIndex(p => p.isDealer) + 1) % state.players.length;
      const rotatedPlayers = updatedPlayers.map((player, idx) => ({
        ...player,
        isDealer: idx === newDealerIndex,
        isPicker: false,
        partner: undefined,
        cards: [],
        tricksWon: []
      }));
      
      const newRoundNumber = state.roundNumber + 1;
      
      const newState = {
        ...state,
        players: rotatedPlayers,
        currentTurn: rotatedPlayers[newDealerIndex].id,
        phase: GamePhase.SCORING,
        roundNumber: newRoundNumber,
        trickNumber: 0,
        isLeaster: false,
        log: [
          ...state.log,
          {
            type: 'ROUND_COMPLETED',
            playerId: '',
            timestamp: Date.now(),
            data: { 
              roundNumber: state.roundNumber,
              pickerTeamScore,
              defenderTeamScore,
              isPicKerTeamWinner
            }
          }
        ]
      };
      
      saveGameState(newState);
      return newState;
    }
    
    case 'NEXT_PLAYER': {
      // Find the current player index
      const currentPlayerIndex = state.players.findIndex(p => p.id === state.currentTurn);
      
      if (currentPlayerIndex === -1) {
        return state;
      }
      
      // Get the next player
      const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length;
      const nextPlayerId = state.players[nextPlayerIndex].id;
      
      const newState = {
        ...state,
        currentTurn: nextPlayerId
      };
      
      saveGameState(newState);
      return newState;
    }
    
    case 'END_GAME': {
      const newState = {
        ...state,
        phase: GamePhase.GAME_OVER,
        log: [
          ...state.log,
          {
            type: 'GAME_ENDED',
            playerId: '',
            timestamp: Date.now(),
            data: { 
              finalScores: state.players.map(p => ({ id: p.id, score: p.score }))
            }
          }
        ]
      };
      
      saveGameState(newState);
      return newState;
    }
    
    case 'RESET_GAME': {
      return initialState;
    }
    
    case 'LOAD_GAME': {
      return action.gameState;
    }
    
    default:
      return state;
  }
}

// Provider component
interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  // Load saved game state on component mount
  useEffect(() => {
    const savedState = loadGameState();
    if (savedState) {
      dispatch({ type: 'LOAD_GAME', gameState: savedState });
    }
  }, []);
  
  // Game actions
  const startGame = (players: Omit<Player, 'cards' | 'score' | 'isDealer' | 'tricksWon'>[]) => {
    dispatch({ type: 'START_GAME', players });
  };
  
  const pickBlind = (playerId: string) => {
    dispatch({ type: 'PICK_BLIND', playerId });
  };
  
  const passBlind = (playerId: string) => {
    dispatch({ type: 'PASS_BLIND', playerId });
  };
  
  const buryCards = (playerId: string, cards: Card[]) => {
    dispatch({ type: 'BURY_CARDS', playerId, cards });
  };
  
  const callPartner = (playerId: string, partnerId: string) => {
    dispatch({ type: 'CALL_PARTNER', playerId, partnerId });
  };
  
  const playCard = (playerId: string, card: Card) => {
    dispatch({ type: 'PLAY_CARD', playerId, card });
  };
  
  const isValidCardPlay = (playerId: string, card: Card): boolean => {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return false;
    
    return isValidPlay(card, player, state.currentTrick, state.leadSuit);
  };
  
  // AI turn handling
  const handleAITurn = () => {
    const currentPlayer = state.players.find(p => p.id === state.currentTurn);
    
    if (!currentPlayer || currentPlayer.isHuman || state.phase === GamePhase.GAME_OVER) {
      return;
    }
    
    // Add a small delay to simulate AI thinking
    setTimeout(() => {
      // Handle different game phases
      switch (state.phase) {
        case GamePhase.PICKING:
          if (shouldPickBlind(currentPlayer, state)) {
            pickBlind(currentPlayer.id);
            
            // If AI is the picker, handle burying cards automatically
            if (currentPlayer.isPicker) {
              const cardsToBury = chooseBuryCards(currentPlayer, state.deck);
              buryCards(currentPlayer.id, cardsToBury);
            }
          } else {
            passBlind(currentPlayer.id);
          }
          break;
          
        case GamePhase.BURYING:
          if (currentPlayer.isPicker) {
            const cardsToBury = chooseBuryCards(currentPlayer, []);
            buryCards(currentPlayer.id, cardsToBury);
          }
          break;
          
        case GamePhase.CALLING_PARTNER:
          if (currentPlayer.isPicker) {
            // Simple partner selection - just pick the first non-picker
            const partnerId = state.players.find(p => !p.isPicker)?.id || '';
            callPartner(currentPlayer.id, partnerId);
          }
          break;
          
        case GamePhase.PLAYING:
          const cardToPlay = chooseCardToPlay(currentPlayer, state);
          playCard(currentPlayer.id, cardToPlay);
          break;
          
        default:
          break;
      }
    }, 500);
  };
  
  // Run AI turn automatically when it's an AI's turn
  useEffect(() => {
    const currentPlayer = state.players.find(p => p.id === state.currentTurn);
    if (currentPlayer && !currentPlayer.isHuman && state.phase !== GamePhase.GAME_OVER) {
      handleAITurn();
    }
  }, [state.currentTurn, state.phase]);
  
  const contextValue = {
    state,
    dispatch,
    startGame,
    pickBlind,
    passBlind,
    buryCards,
    callPartner,
    playCard,
    isValidCardPlay,
    handleAITurn
  };
  
  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook to use the game context
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  
  return context;
};

export default GameContext;