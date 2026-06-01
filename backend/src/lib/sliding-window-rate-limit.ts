type RateLimitBucket = {
  hits: number[];
  expiresAt: number;
};

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private nextSweepAt = 0;
  private sweepCursor = 0;

  constructor(
    private readonly args: {
      windowMs: number;
      maxHits: number;
      sweepEveryMs?: number;
      maxSweepEntries?: number;
    },
  ) {}

  hit(key: string, now = Date.now()): boolean {
    this.sweep(now);
    const bucket = this.buckets.get(key);
    const hits = (bucket?.hits ?? []).filter(
      (timestamp) => now - timestamp < this.args.windowMs,
    );

    if (hits.length >= this.args.maxHits) {
      if (hits.length > 0) {
        this.buckets.set(key, {
          hits,
          expiresAt: hits[hits.length - 1]! + this.args.windowMs,
        });
      } else {
        this.buckets.delete(key);
      }
      return false;
    }

    hits.push(now);
    this.buckets.set(key, {
      hits,
      expiresAt: now + this.args.windowMs,
    });
    return true;
  }

  private sweep(now: number) {
    if (now < this.nextSweepAt) return;
    this.nextSweepAt = now + (this.args.sweepEveryMs ?? this.args.windowMs);

    const keys = [...this.buckets.keys()];
    if (keys.length === 0) {
      this.sweepCursor = 0;
      return;
    }

    const maxEntries = Math.min(
      this.args.maxSweepEntries ?? 100,
      keys.length,
    );
    for (let index = 0; index < maxEntries; index += 1) {
      const key = keys[(this.sweepCursor + index) % keys.length];
      if (!key) continue;
      const bucket = this.buckets.get(key);
      if (!bucket || bucket.expiresAt <= now) {
        this.buckets.delete(key);
      }
    }
    this.sweepCursor = (this.sweepCursor + maxEntries) % keys.length;
  }
}
