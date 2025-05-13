// src/utils/electionAlgo.js
import logger from './logger.js';

/**
 * Implementation of the Bully Algorithm for leader election
 * Used to select a drawer for each round
 */
export class BullyAlgorithm {
  constructor(nodeId, allNodes = []) {
    this.nodeId = nodeId;
    this.allNodes = allNodes; // Array of node IDs
    this.currentLeader = null;
    this.electionInProgress = false;
    this.electionTimeout = null;
    this.timeoutDuration = 5000; // 5 seconds timeout for election
    
    logger.debug(`Initialized Bully Algorithm for node ${nodeId} with nodes: ${allNodes.join(', ')}`);
  }

  // Start an election process
  startElection() {
    if (this.electionInProgress) {
      logger.debug('Election already in progress, ignoring request');
      return;
    }
    
    logger.info(`Node ${this.nodeId} is starting an election`);
    this.electionInProgress = true;
    
    // Find nodes with higher IDs
    const higherNodes = this.allNodes.filter(nodeId => 
      nodeId > this.nodeId
    );
    
    if (higherNodes.length === 0) {
      // No higher nodes, declare self as leader
      logger.info(`Node ${this.nodeId} declares itself as leader`);
      this.becomeLeader();
    } else {
      // Send election message to higher nodes
      logger.debug(`Node ${this.nodeId} sending election message to higher nodes: ${higherNodes.join(', ')}`);
      
      // Set a timeout for waiting responses
      this.electionTimeout = setTimeout(() => {
        logger.info(`Election timeout reached, node ${this.nodeId} declares itself as leader`);
        this.becomeLeader();
      }, this.timeoutDuration);
    }
    
    return {
      electionStarted: true,
      initiator: this.nodeId,
      higherNodes: higherNodes,
      timestamp: new Date()
    };
  }

  // Handle receiving an election message
  receiveElection(fromNodeId) {
    logger.debug(`Node ${this.nodeId} received election message from node ${fromNodeId}`);
    
    // Send an OK message back
    logger.debug(`Node ${this.nodeId} sending OK message to node ${fromNodeId}`);
    
    // Start a new election
    if (!this.electionInProgress) {
      this.startElection();
    }
    
    return {
      okSent: true,
      receiver: this.nodeId,
      sender: fromNodeId,
      timestamp: new Date()
    };
  }

  // Handle receiving an OK message
  receiveOK(fromNodeId) {
    logger.debug(`Node ${this.nodeId} received OK message from node ${fromNodeId}`);
    
    // If we got an OK, we know we won't be the leader
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
      this.electionTimeout = null;
    }
    
    this.electionInProgress = false;
    
    return {
      electionAborted: true,
      receiver: this.nodeId,
      sender: fromNodeId,
      timestamp: new Date()
    };
  }

  // Handle receiving a coordinator message
  receiveCoordinator(fromNodeId) {
    logger.debug(`Node ${this.nodeId} received coordinator message from node ${fromNodeId}`);
    
    this.currentLeader = fromNodeId;
    this.electionInProgress = false;
    
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
      this.electionTimeout = null;
    }
    
    logger.info(`Node ${this.nodeId} acknowledges ${fromNodeId} as the leader`);
    
    return {
      leaderAcknowledged: true,
      leader: fromNodeId,
      receiver: this.nodeId,
      timestamp: new Date()
    };
  }

  // Become the leader and notify others
  becomeLeader() {
    this.currentLeader = this.nodeId;
    this.electionInProgress = false;
    
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
      this.electionTimeout = null;
    }
    
    logger.info(`Node ${this.nodeId} is now the leader`);
    
    // Notify all other nodes
    const otherNodes = this.allNodes.filter(nodeId => nodeId !== this.nodeId);
    logger.debug(`Node ${this.nodeId} sending coordinator message to nodes: ${otherNodes.join(', ')}`);
    
    return {
      newLeader: this.nodeId,
      notifiedNodes: otherNodes,
      timestamp: new Date()
    };
  }

  // Get the current leader
  getLeader() {
    return this.currentLeader;
  }

  // Update the list of all nodes in the system
  updateNodes(nodes) {
    this.allNodes = [...nodes];
    logger.debug(`Updated node list for ${this.nodeId}: ${this.allNodes.join(', ')}`);
  }
  
  // Detect if the leader has failed and start a new election
  detectLeaderFailure() {
    if (this.currentLeader && !this.allNodes.includes(this.currentLeader)) {
      logger.warn(`Leader ${this.currentLeader} not in node list anymore, starting new election`);
      this.currentLeader = null;
      this.startElection();
    }
  }
}

/**
 * Implementation of the Ring Algorithm for leader election
 * Used as a fallback for the Bully Algorithm
 */
export class RingAlgorithm {
  constructor(nodeId, allNodes = []) {
    this.nodeId = nodeId;
    this.allNodes = [...allNodes].sort(); // Sort nodes for the ring
    this.currentLeader = null;
    this.electionInProgress = false;
    this.electionMessage = null;
    
    logger.debug(`Initialized Ring Algorithm for node ${nodeId} with nodes: ${this.allNodes.join(', ')}`);
  }

  // Get the next node in the ring
  getNextNode() {
    const currentIndex = this.allNodes.indexOf(this.nodeId);
    if (currentIndex === -1) {
      logger.error(`Current node ${this.nodeId} not found in the node list`);
      return null;
    }
    
    const nextIndex = (currentIndex + 1) % this.allNodes.length;
    return this.allNodes[nextIndex];
  }

  // Start an election
  startElection() {
    if (this.electionInProgress) {
      logger.debug('Election already in progress, ignoring request');
      return;
    }
    
    logger.info(`Node ${this.nodeId} is starting a ring election`);
    this.electionInProgress = true;
    
    // Create election message with this node's ID
    this.electionMessage = [this.nodeId];
    
    // Send to next node
    const nextNode = this.getNextNode();
    logger.debug(`Node ${this.nodeId} sending election message ${this.electionMessage} to node ${nextNode}`);
    
    return {
      electionStarted: true,
      initiator: this.nodeId,
      nextNode: nextNode,
      message: [...this.electionMessage],
      timestamp: new Date()
    };
  }

  // Receive an election message
  receiveElection(message) {
    logger.debug(`Node ${this.nodeId} received election message: ${message}`);
    
    // Check if this node is already in the message
    if (message.includes(this.nodeId)) {
      // Complete circle, determine leader
      const leader = Math.max(...message);
      logger.info(`Election completed, node ${leader} is the new leader`);
      
      // Start the coordinator message
      this.electionInProgress = false;
      this.currentLeader = leader;
      
      // Forward coordinator message
      const nextNode = this.getNextNode();
      logger.debug(`Node ${this.nodeId} forwarding coordinator message for leader ${leader} to ${nextNode}`);
      
      return {
        electionCompleted: true,
        leader: leader,
        receiver: this.nodeId,
        nextNode: nextNode,
        timestamp: new Date()
      };
    } else {
      // Add this node to the message and forward
      const updatedMessage = [...message, this.nodeId];
      this.electionMessage = updatedMessage;
      
      const nextNode = this.getNextNode();
      logger.debug(`Node ${this.nodeId} forwarding updated election message ${updatedMessage} to ${nextNode}`);
      
      return {
        messageForwarded: true,
        updatedMessage: [...updatedMessage],
        receiver: this.nodeId,
        nextNode: nextNode,
        timestamp: new Date()
      };
    }
  }

  // Receive a coordinator message
  receiveCoordinator(leader) {
    logger.debug(`Node ${this.nodeId} received coordinator message for leader ${leader}`);
    
    this.currentLeader = leader;
    this.electionInProgress = false;
    
    // If not the initiator, forward the message
    if (leader !== this.nodeId) {
      const nextNode = this.getNextNode();
      logger.debug(`Node ${this.nodeId} forwarding coordinator message for leader ${leader} to ${nextNode}`);
      
      return {
        coordinatorForwarded: true,
        leader: leader,
        receiver: this.nodeId,
        nextNode: nextNode,
        timestamp: new Date()
      };
    } else {
      // This node was the initiator, election is fully complete
      logger.info(`Coordinator message returned to initiator, election fully complete`);
      
      return {
        electionFullyCompleted: true,
        leader: leader,
        timestamp: new Date()
      };
    }
  }

  // Get the current leader
  getLeader() {
    return this.currentLeader;
  }

  // Update the list of all nodes in the system
  updateNodes(nodes) {
    this.allNodes = [...nodes].sort(); // Sort for consistent ring order
    logger.debug(`Updated node list for ${this.nodeId}: ${this.allNodes.join(', ')}`);
  }
  
  // Detect if the current node becomes disconnected from the ring
  detectDisconnection() {
    if (!this.allNodes.includes(this.nodeId)) {
      logger.error(`This node ${this.nodeId} is no longer in the node list`);
      return true;
    }
    return false;
  }
}