// lib/vectorClock.ts (or utils/vectorClock.ts)

/**
 * Represents a vector clock for tracking causality in distributed events.
 * Each client/node should maintain its own instance.
 */
export default class VectorClock {
    /**
     * The unique identifier for the current node/client.
     */
    public readonly nodeId: string;
  
    /**
     * The clock itself, a record of node IDs to their current time (integer).
     */
    public clock: Record<string, number>;
  
    /**
     * Initializes a new VectorClock instance.
     * @param nodeId The unique identifier for this node/client.
     * @param initialClock An optional initial clock state to start from (e.g., when loading state).
     */
    constructor(nodeId: string, initialClock: Record<string, number> = {}) {
      this.nodeId = nodeId;
      this.clock = { ...initialClock }; // Create a copy
  
      // Initialize this node's counter if not present in the initial clock.
      if (this.clock[this.nodeId] === undefined) {
        this.clock[this.nodeId] = 0;
      }
      // console.debug(`[VectorClock] Initialized for node "${nodeId}" with clock:`, JSON.stringify(this.clock));
    }
  
    /**
     * Increments the logical time for the current node.
     * This should be called before sending an event that this clock will timestamp.
     * @returns A new object representing the current state of the clock after ticking.
     */
    public tick(): Record<string, number> {
      this.clock[this.nodeId] = (this.clock[this.nodeId] || 0) + 1;
      // console.debug(`[VectorClock] Tick for node "${this.nodeId}":`, JSON.stringify(this.clock));
      return { ...this.clock }; // Return a copy
    }
  
    /**
     * Merges this vector clock with a received vector clock.
     * This should be called when an event with a vector timestamp is received from another node.
     * The clock is updated by taking the maximum value for each node ID present in either clock.
     * @param receivedClock The vector clock received from another node.
     * @returns A new object representing the current state of the clock after merging.
     */
    public merge(receivedClock: Record<string, number>): Record<string, number> {
      // console.debug(`[VectorClock] Merging for node "${this.nodeId}". Local:`, JSON.stringify(this.clock), "Received:", JSON.stringify(receivedClock));
  
      const allNodeIds = new Set<string>([...Object.keys(this.clock), ...Object.keys(receivedClock)]);
  
      allNodeIds.forEach(id => {
        const localValue = this.clock[id] || 0;
        const receivedValue = receivedClock[id] || 0;
        this.clock[id] = Math.max(localValue, receivedValue);
      });
  
      // console.debug(`[VectorClock] Merged for node "${this.nodeId}":`, JSON.stringify(this.clock));
      return { ...this.clock }; // Return a copy
    }
  
    /**
     * Compares two vector clocks to determine their causal relationship.
     * - 'before': clockA happened before clockB.
     * - 'after': clockA happened after clockB.
     * - 'concurrent': clockA and clockB happened concurrently.
     * - 'identical': clockA and clockB are identical.
     * @param clockA The first vector clock.
     * @param clockB The second vector clock.
     * @returns A string indicating the causal relationship.
     */
    public static compare(
      clockA: Record<string, number>,
      clockB: Record<string, number>
    ): 'before' | 'after' | 'concurrent' | 'identical' {
      let aIsStrictlyLess = false; // At least one component in A is less than B
      let bIsStrictlyLess = false; // At least one component in B is less than A
  
      const allNodeIds = new Set<string>([...Object.keys(clockA), ...Object.keys(clockB)]);
  
      for (const id of allNodeIds) {
        const valA = clockA[id] || 0;
        const valB = clockB[id] || 0;
  
        if (valA < valB) {
          aIsStrictlyLess = true;
        } else if (valB < valA) {
          bIsStrictlyLess = true;
        }
      }
  
      if (aIsStrictlyLess && !bIsStrictlyLess) {
        return 'before'; // All components of A are <= B, and at least one is <
      }
      if (bIsStrictlyLess && !aIsStrictlyLess) {
        return 'after'; // All components of B are <= A, and at least one is <
      }
      if (aIsStrictlyLess && bIsStrictlyLess) {
        return 'concurrent'; // Neither dominates the other
      }
      return 'identical'; // All components must be equal
    }
  
    /**
     * Gets a copy of the current clock state.
     * @returns A new object representing the current state of the clock.
     */
    public getClock(): Record<string, number> {
      return { ...this.clock };
    }
  
    /**
     * Gets a plain object representation of the clock, suitable for serialization (e.g., sending over network).
     * @returns A new object representing the current state of the clock.
     */
    public toObject(): Record<string, number> {
      return { ...this.clock };
    }
  }