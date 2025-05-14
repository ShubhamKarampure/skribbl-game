export default class VectorClock {
  public readonly nodeId: string;
  public clock: Record<string, number>;

  constructor(nodeId: string, initialClock: Record<string, number> = {}) {
    this.nodeId = nodeId;
    this.clock = { ...initialClock };
    if (this.clock[this.nodeId] === undefined) {
      this.clock[this.nodeId] = 0;
    }
  }

  public tick(): Record<string, number> {
    this.clock[this.nodeId] = (this.clock[this.nodeId] || 0) + 1;
    return { ...this.clock };
  }

  public merge(receivedClock: Record<string, number>): Record<string, number> {
    const allNodeIds = new Set<string>([...Object.keys(this.clock), ...Object.keys(receivedClock)]);
    allNodeIds.forEach(id => {
      const localValue = this.clock[id] || 0;
      const receivedValue = receivedClock[id] || 0;
      this.clock[id] = Math.max(localValue, receivedValue);
    });
    return { ...this.clock };
  }

  public static compare(
    clockA: Record<string, number>,
    clockB: Record<string, number>
  ): 'before' | 'after' | 'concurrent' | 'identical' {
    let aIsStrictlyLess = false;
    let bIsStrictlyLess = false;
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
      return 'before';
    }
    if (bIsStrictlyLess && !aIsStrictlyLess) {
      return 'after';
    }
    if (aIsStrictlyLess && bIsStrictlyLess) {
      return 'concurrent';
    }
    return 'identical';
  }

  public getClock(): Record<string, number> {
    return { ...this.clock };
  }

  public toObject(): Record<string, number> {
    return { ...this.clock };
  }
}
