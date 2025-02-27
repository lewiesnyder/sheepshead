// Card types
export enum Suit {
  CLUBS = "CLUBS",
  SPADES = "SPADES",
  HEARTS = "HEARTS",
  DIAMONDS = "DIAMONDS",
}

export enum Rank {
  SEVEN = "7",
  EIGHT = "8",
  NINE = "9",
  TEN = "10",
  JACK = "JACK",
  QUEEN = "QUEEN",
  KING = "KING",
  ACE = "ACE",
}

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
  isTrump: boolean;
}

// Player types
export interface Player {
  id: string;
  name: string;
  avatar?: string;
  cards: Card[];
  score: number;
  isDealer: boolean;
  isPicker?: boolean;
  partner?: string; // ID of the called partner (if using partner play)
  tricksWon: Card[][];
  isHuman: boolean;
}

// Game state types
export enum GamePhase {
  DEALING = "DEALING",
  PICKING = "PICKING",
  BURYING = "BURYING",
  CALLING_PARTNER = "CALLING_PARTNER", // Optional - only used in partner play
  PLAYING = "PLAYING",
  SCORING = "SCORING",
  GAME_OVER = "GAME_OVER",
}

export interface GameState {
  gameId: string;
  players: Player[];
  currentTurn: string; // ID of player whose turn it is
  phase: GamePhase;
  deck: Card[];
  buried: Card[];
  currentTrick: Card[];
  leadSuit?: Suit;
  roundNumber: number;
  trickNumber: number;
  isLeaster: boolean;
  isDoubler: boolean;
  isReDoubler: boolean;
  calledAce?: Card; // The card called in partner play
  log: GameEvent[];
}

export interface GameEvent {
  type: string;
  playerId: string;
  timestamp: number;
  data?: any;
}

// Stats types
export interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pickerWins: number;
  pickerLosses: number;
  defenderWins: number;
  defenderLosses: number;
  partnerWins: number;
  soloWins: number;
  soloLosses: number;
  leasterWins: number;
  schneiders: number; // When opponents score 0
  schneidereds: number; // When player team scores 0
  totalPointsWon: number;
  totalPointsLost: number;
}

export interface GameResult {
  gameId: string;
  datePlayed: Date;
  players: string[]; // IDs of players
  picker: string; // ID of picker
  partner?: string; // ID of partner (if applicable)
  pickerTeamScore: number;
  defenderTeamScore: number;
  isLeaster: boolean;
  isDoubled: boolean;
  isReDoubled: boolean;
  isSolo: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  winPercentage: number;
  totalGames: number;
  pickerWinPercentage: number;
  averagePointsPerGame: number;
}