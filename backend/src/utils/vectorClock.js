// src/utils/vectorClock.js
import logger from './logger.js';


class VectorClock {
  constructor(nodeId, initialClock = {}) {
    this.nodeId = nodeId;
    this.clock = { ...initialClock };
    
    // Initialize this node's counter if not present
    if (!this.clock[this.nodeId]) {
      this.clock[this.nodeId] = 0;
    }
    
    logger.debug(`Initialized vector clock for node ${nodeId} with clock ${JSON.stringify(this.clock)}`);
  }

  // Increment the local counter for this node
  tick() {
    this.clock[this.nodeId] = (this.clock[this.nodeId] || 0) + 1;
    logger.debug(`Ticked clock for node ${this.nodeId}: ${JSON.stringify(this.clock)}`);
    return { ...this.clock };
  }

  // Update the local vector clock based on received clock
  merge(receivedClock) {
    logger.debug(`Merging clock for node ${this.nodeId}. Local: ${JSON.stringify(this.clock)}, Received: ${JSON.stringify(receivedClock)}`);
    
    // Update all entries to take the max value between local and received
    const allKeys = new Set([...Object.keys(this.clock), ...Object.keys(receivedClock)]);
    
    allKeys.forEach(key => {
      const localVal = this.clock[key] || 0;
      const receivedVal = receivedClock[key] || 0;
      this.clock[key] = Math.max(localVal, receivedVal);
    });

    logger.debug(`Merged clock for node ${this.nodeId}: ${JSON.stringify(this.clock)}`);
    return { ...this.clock };
  }

  // Compare two vector clocks to determine their causal relationship
  static compare(clockA, clockB) {
    let aGreater = false;
    let bGreater = false;
    
    // Get all unique keys from both clocks
    const allKeys = new Set([...Object.keys(clockA), ...Object.keys(clockB)]);
    
    for (const key of allKeys) {
      const aVal = clockA[key] || 0;
      const bVal = clockB[key] || 0;
      
      if (aVal > bVal) aGreater = true;
      if (bVal > aVal) bGreater = true;
    }
    
    // If A has some greater values and B has some greater values, they're concurrent
    if (aGreater && bGreater) return 'concurrent';
    
    // If A has greater values and B doesn't, A happened after B
    if (aGreater) return 'after';
    
    // If B has greater values and A doesn't, B happened after A
    if (bGreater) return 'before';
    
    // If neither has greater values, they're identical
    return 'identical';
  }

  // Convert to plain object for serialization
  toObject() {
    return { ...this.clock };
  }
}

export default VectorClock;