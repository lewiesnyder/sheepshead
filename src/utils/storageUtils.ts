import { GameState, PlayerStats, GameResult } from "./types";

// Storage keys
const GAME_STATE_KEY = "sheepshead_game_state";
const PLAYER_STATS_KEY = "sheepshead_player_stats";
const GAME_HISTORY_KEY = "sheepshead_game_history";

/**
 * Save the current game state to localStorage
 * @param gameState Current game state
 */
export const saveGameState = (gameState: GameState): void => {
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
  } catch (error) {
    console.error("Failed to save game state:", error);
  }
};

/**
 * Load game state from localStorage
 * @returns The saved game state or null if not found
 */
export const loadGameState = (): GameState | null => {
  try {
    const savedState = localStorage.getItem(GAME_STATE_KEY);
    return savedState ? JSON.parse(savedState) : null;
  } catch (error) {
    console.error("Failed to load game state:", error);
    return null;
  }
};

/**
 * Save player stats to localStorage
 * @param playerStats Array of player statistics
 */
export const savePlayerStats = (playerStats: PlayerStats[]): void => {
  try {
    localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(playerStats));
  } catch (error) {
    console.error("Failed to save player stats:", error);
  }
};

/**
 * Load player stats from localStorage
 * @returns Array of player statistics or empty array if not found
 */
export const loadPlayerStats = (): PlayerStats[] => {
  try {
    const savedStats = localStorage.getItem(PLAYER_STATS_KEY);
    return savedStats ? JSON.parse(savedStats) : [];
  } catch (error) {
    console.error("Failed to load player stats:", error);
    return [];
  }
};

/**
 * Get stats for a specific player
 * @param playerId ID of the player
 * @returns Player's stats or null if not found
 */
export const getPlayerStats = (playerId: string): PlayerStats | null => {
  const allStats = loadPlayerStats();
  return allStats.find(stats => stats.playerId === playerId) || null;
};

/**
 * Save game result to history
 * @param gameResult Result of the completed game
 */
export const saveGameResult = (gameResult: GameResult): void => {
  try {
    const gameHistory = loadGameHistory();
    gameHistory.push(gameResult);
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(gameHistory));
  } catch (error) {
    console.error("Failed to save game result:", error);
  }
};

/**
 * Load game history from localStorage
 * @returns Array of game results or empty array if not found
 */
export const loadGameHistory = (): GameResult[] => {
  try {
    const history = localStorage.getItem(GAME_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error("Failed to load game history:", error);
    return [];
  }
};

/**
 * Update player stats after a game has completed
 * @param gameResult Result of the completed game
 */
export const updatePlayerStats = (gameResult: GameResult): void => {
  const allStats = loadPlayerStats();
  const pickerTeam = gameResult.partner 
    ? [gameResult.picker, gameResult.partner] 
    : [gameResult.picker];
  const pickerTeamWon = gameResult.pickerTeamScore > gameResult.defenderTeamScore;
  
  // Update stats for each player
  gameResult.players.forEach(playerId => {
    let playerStats = allStats.find(stats => stats.playerId === playerId);
    
    // Create new stats if player doesn't have them yet
    if (!playerStats) {
      playerStats = {
        playerId,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pickerWins: 0,
        pickerLosses: 0,
        defenderWins: 0,
        defenderLosses: 0,
        partnerWins: 0,
        soloWins: 0,
        soloLosses: 0,
        leasterWins: 0,
        schneiders: 0,
        schneidereds: 0,
        totalPointsWon: 0,
        totalPointsLost: 0
      };
      allStats.push(playerStats);
    }
    
    // Update common stats
    playerStats.gamesPlayed++;
    
    const isPickerTeam = pickerTeam.includes(playerId);
    const isWinner = (isPickerTeam && pickerTeamWon) || (!isPickerTeam && !pickerTeamWon);
    
    if (isWinner) {
      playerStats.wins++;
      playerStats.totalPointsWon += isPickerTeam 
        ? gameResult.pickerTeamScore 
        : gameResult.defenderTeamScore;
    } else {
      playerStats.losses++;
      playerStats.totalPointsLost += isPickerTeam 
        ? gameResult.defenderTeamScore 
        : gameResult.pickerTeamScore;
    }
    
    // Update role-specific stats
    if (playerId === gameResult.picker) {
      // Picker stats
      if (pickerTeamWon) {
        playerStats.pickerWins++;
        if (gameResult.isSolo) {
          playerStats.soloWins++;
        }
      } else {
        playerStats.pickerLosses++;
        if (gameResult.isSolo) {
          playerStats.soloLosses++;
        }
      }
      
      // Track schneiders (opponents scored 0)
      if (gameResult.defenderTeamScore === 0) {
        playerStats.schneiders++;
      }
      // Track schneidereds (picker team scored 0)
      if (gameResult.pickerTeamScore === 0) {
        playerStats.schneidereds++;
      }
    } else if (gameResult.partner && playerId === gameResult.partner) {
      // Partner stats
      if (pickerTeamWon) {
        playerStats.partnerWins++;
      }
    } else {
      // Defender stats
      if (!pickerTeamWon) {
        playerStats.defenderWins++;
      } else {
        playerStats.defenderLosses++;
      }
    }
    
    // Leaster stats
    if (gameResult.isLeaster && isWinner) {
      playerStats.leasterWins++;
    }
  });
  
  // Save updated stats
  savePlayerStats(allStats);
};

/**
 * Clear all game data from localStorage
 */
export const clearGameData = (): void => {
  try {
    localStorage.removeItem(GAME_STATE_KEY);
    localStorage.removeItem(PLAYER_STATS_KEY);
    localStorage.removeItem(GAME_HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear game data:", error);
  }
};