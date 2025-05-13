import { BullyAlgorithm } from '../utils/electionAlgo.js';
import logger from '../utils/logger.js';

class RoomElectionManager {
  constructor(roomId, initialPlayerIds, onNewLeaderElected) {
    this.roomId = roomId;
    this.onNewLeaderElected = onNewLeaderElected; // (roomId, newLeaderId) => void
    this.bullyInstances = new Map(); // playerId -> BullyAlgorithm instance
    this.currentPlayerIds = new Set(initialPlayerIds);
    this.currentLeader = null; // Explicitly initialize leader to null

    initialPlayerIds.forEach(playerId => this.addPlayerToElection(playerId));
    logger.info(`[Room ${roomId}] ElectionManager initialized with players: ${[...this.currentPlayerIds].join(', ')}`);
  }

  // Simulates message passing between BullyAlgorithm instances
  messageChannel(targetNodeId, messageType, fromNodeId, data = null) {
    const targetInstance = this.bullyInstances.get(targetNodeId);
    if (targetInstance) {
      logger.debug(`[Room ${this.roomId}] Election msg to ${targetNodeId}: ${messageType} from ${fromNodeId}`);
      targetInstance.receiveMessage(messageType, fromNodeId, data);
      // Check if this message resulted in a leader
      const newLeader = targetInstance.getLeader();
      if (newLeader && (!this.currentLeader || this.currentLeader !== newLeader)) {
         this.handleLeaderChange(newLeader);
      }
    } else {
      logger.warn(`[Room ${this.roomId}] Election msg: Target node ${targetNodeId} not found for message ${messageType}.`);
    }
  }

  addPlayerToElection(playerId) {
    if (!this.bullyInstances.has(playerId)) {
      const instance = new BullyAlgorithm(playerId, [...this.currentPlayerIds], this.messageChannel.bind(this));
      this.bullyInstances.set(playerId, instance);
      this.currentPlayerIds.add(playerId);
      this.updateAllInstancesNodeLists();
      logger.info(`[Room ${this.roomId}] Player ${playerId} added to election group.`);
    }
  }

  removePlayerFromElection(playerId) {
    const instance = this.bullyInstances.get(playerId);
    if (instance) {
        instance.cleanup(); // Clear any timeouts
        this.bullyInstances.delete(playerId);
        this.currentPlayerIds.delete(playerId);
        this.updateAllInstancesNodeLists();
        logger.info(`[Room ${this.roomId}] Player ${playerId} removed from election group.`);

        // If the removed player was the current leader, or if no leader and few players, trigger election
        if (this.currentLeader === playerId || (!this.currentLeader && this.currentPlayerIds.size >= 1)) {
            logger.info(`[Room ${this.roomId}] Leader ${playerId} removed or no leader. Triggering new election.`);
            this.currentLeader = null; // Unset leader
            this.triggerElection();
        }
    }
  }

  updateAllInstancesNodeLists() {
    const playerIdsArray = [...this.currentPlayerIds];
    this.bullyInstances.forEach(instance => {
      instance.setNodes(playerIdsArray);
    });
  }

  triggerElection(initiatorId = null) {
    if (this.currentPlayerIds.size === 0) {
      logger.warn(`[Room ${this.roomId}] No players to conduct election.`);
      this.handleLeaderChange(null); // No leader
      return null;
    }
    if (this.currentPlayerIds.size === 1) {
      const solePlayerId = [...this.currentPlayerIds][0];
      logger.info(`[Room ${this.roomId}] Only one player ${solePlayerId}. Electing as leader.`);
      this.bullyInstances.get(solePlayerId)?.becomeLeader(); // Ensure this instance knows it's leader
      this.handleLeaderChange(solePlayerId);
      return solePlayerId;
    }

    // Use an atomic operation to check and mark election in progress
    // This is a simplification; real Bully allows multiple initiations that resolve.
    let electionAlreadyInProgress = false;
    for (const instance of this.bullyInstances.values()) {
        if (instance.isElectionInProgress()) {
            electionAlreadyInProgress = true;
            break;
        }
    }
    
    if (electionAlreadyInProgress) {
        logger.info(`[Room ${this.roomId}] Election already in progress. New election request ignored.`);
        return this.currentLeader; // Return current leader or null
    }

    const actualInitiatorId = initiatorId && this.bullyInstances.has(initiatorId)
      ? initiatorId
      : [...this.currentPlayerIds][0]; // Default to the first player if initiator is invalid or null

    const initiatorInstance = this.bullyInstances.get(actualInitiatorId);
    if (initiatorInstance) {
      logger.info(`[Room ${this.roomId}] Triggering election, initiated by ${actualInitiatorId}.`);
      initiatorInstance.startElection();
    } else {
      logger.error(`[Room ${this.roomId}] Could not find initiator instance for ${actualInitiatorId}.`);
    }
    return null; // Election is async, leader will be set via callback
  }

  handleLeaderChange(newLeaderId) {
    if (this.currentLeader !== newLeaderId) {
        this.currentLeader = newLeaderId;
        logger.info(`[Room ${this.roomId}] New leader elected: ${newLeaderId}`);
        // Propagate this information to all instances so they know the leader
        this.bullyInstances.forEach(instance => {
            if (instance.nodeId !== newLeaderId) { // Don't send to self if it became leader
                instance.receiveMessage('COORDINATOR', newLeaderId);
            }
        });
        if (this.onNewLeaderElected) {
            this.onNewLeaderElected(this.roomId, newLeaderId);
        }
    }
  }

  getLeader() {
    return this.currentLeader;
  }
    
  // Fixed indentation - this was inside getLeader() before
  setNodes(nodeIds) {
    this.allNodeIds = [...nodeIds];
    // Optionally, you might want to determine higher priority nodes again
    this.higherPriorityNodes = this.allNodeIds.filter(id => id > this.nodeId);
  }

  destroy() {
    this.bullyInstances.forEach(instance => instance.cleanup());
    this.bullyInstances.clear();
    this.currentPlayerIds.clear();
    this.currentLeader = null; // Clear leader reference
    logger.info(`[Room ${this.roomId}] ElectionManager destroyed.`);
  }
}

export default RoomElectionManager;