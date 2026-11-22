import { HiddenTeamRole, HiddenTeamFaction } from '@gamehouse/shared';

export interface PlayerRoleData {
  playerId: string;
  slotNumber: number; // Fixed turn slot 1-6
  team: HiddenTeamFaction;
  originalRole: HiddenTeamRole;
  currentRole: HiddenTeamRole;
}

export class RoleAssignmentService {
  private playerRoles: Map<string, PlayerRoleData> = new Map();
  private turnSlots: string[] = []; // player IDs in slot 1 to 6

  /**
   * Initializes teams, roles, and fixed turn slots 1-6 for exactly 6 players.
   * Team distribution defaults to 2 RED, 2 BLUE, 2 NEUTRAL.
   */
  public initializeMatch(
    playerIds: string[],
    teamDistribution: Record<HiddenTeamFaction, number> = { RED: 2, BLUE: 2, NEUTRAL: 2 }
  ): void {
    if (playerIds.length !== 6) {
      throw new Error(`Hidden Team requires exactly 6 players. Received: ${playerIds.length}`);
    }

    this.playerRoles.clear();

    // 1. Establish fixed turn slots 1 to 6 (order of playerIds)
    this.turnSlots = [...playerIds];

    // 2. Prepare team deck
    const teamDeck: HiddenTeamFaction[] = [];
    (Object.keys(teamDistribution) as HiddenTeamFaction[]).forEach((team) => {
      const count = teamDistribution[team] || 0;
      for (let i = 0; i < count; i++) {
        teamDeck.push(team);
      }
    });

    // Ensure 6 team cards total
    while (teamDeck.length < 6) {
      teamDeck.push('NEUTRAL');
    }
    // Shuffle teams
    const shuffledTeams = [...teamDeck].sort(() => Math.random() - 0.5);

    // 3. Prepare 6 unique roles
    const allRoles: HiddenTeamRole[] = [
      'ROLE_1_SWAPPER',
      'ROLE_2_ROLLER',
      'ROLE_3_MULTIPLIER',
      'ROLE_4_INSPECTOR',
      'ROLE_5_SELECTOR',
      'ROLE_6_CARD_SWAPPER',
    ];
    // Shuffle roles
    const shuffledRoles = [...allRoles].sort(() => Math.random() - 0.5);

    // 4. Assign to players
    playerIds.forEach((playerId, index) => {
      const slotNumber = index + 1; // 1 to 6
      const team = shuffledTeams[index];
      const role = shuffledRoles[index];

      this.playerRoles.set(playerId, {
        playerId,
        slotNumber,
        team,
        originalRole: role,
        currentRole: role,
      });
    });
  }

  public getPlayerRoleData(playerId: string): PlayerRoleData | undefined {
    return this.playerRoles.get(playerId);
  }

  public getAllPlayerData(): PlayerRoleData[] {
    return Array.from(this.playerRoles.values());
  }

  public getTurnSlots(): string[] {
    return [...this.turnSlots];
  }

  public getPlayerAtSlot(slotNumber: number): string | undefined {
    return this.turnSlots[slotNumber - 1];
  }

  public getPlayerSlot(playerId: string): number {
    const data = this.playerRoles.get(playerId);
    return data ? data.slotNumber : -1;
  }

  public getCurrentRole(playerId: string): HiddenTeamRole | undefined {
    return this.playerRoles.get(playerId)?.currentRole;
  }

  public getPlayerWithRole(role: HiddenTeamRole): string | undefined {
    for (const [playerId, data] of this.playerRoles.entries()) {
      if (data.currentRole === role) {
        return playerId;
      }
    }
    return undefined;
  }

  /**
   * ROLE 1 — ROLE ABILITY SWAPPER
   * Atomically exchanges the abilities of two players.
   * Turn slots remain completely fixed.
   * Duplicate abilities are prevented.
   */
  public swapRoles(
    playerAId: string,
    playerBId: string
  ): { success: boolean; error?: string; roleA?: HiddenTeamRole; roleB?: HiddenTeamRole } {
    if (playerAId === playerBId) {
      return { success: false, error: 'Cannot swap roles with the same player.' };
    }

    const dataA = this.playerRoles.get(playerAId);
    const dataB = this.playerRoles.get(playerBId);

    if (!dataA || !dataB) {
      return { success: false, error: 'One or both players not found in match.' };
    }

    // Exchange abilities atomically
    const roleA = dataA.currentRole;
    const roleB = dataB.currentRole;

    dataA.currentRole = roleB;
    dataB.currentRole = roleA;

    return {
      success: true,
      roleA: dataA.currentRole,
      roleB: dataB.currentRole,
    };
  }

  /**
   * Helper for unit tests / preset configurations
   */
  public overrideAssignments(
    assignments: Array<{ playerId: string; slotNumber: number; team: HiddenTeamFaction; role: HiddenTeamRole }>
  ): void {
    this.playerRoles.clear();
    this.turnSlots = new Array(6);

    assignments.forEach((a) => {
      this.playerRoles.set(a.playerId, {
        playerId: a.playerId,
        slotNumber: a.slotNumber,
        team: a.team,
        originalRole: a.role,
        currentRole: a.role,
      });
      this.turnSlots[a.slotNumber - 1] = a.playerId;
    });
  }
}
