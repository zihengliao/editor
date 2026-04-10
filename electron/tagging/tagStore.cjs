class TagStore {
  constructor() {
    // Canonical shape: { "tag label": [timeMs, ...] }
    this.tags = {};
  }

  getAllTags() {
    return { ...this.tags };
  }

  addTag(payload) {
    if (!payload || typeof payload.stat !== "string" || !Number.isFinite(payload.timeMs)) {
      throw new Error("Tag payload is invalid.");
    }

    const stat = payload.stat.trim();
    if (!stat) {
      throw new Error("Tag label is required.");
    }

    const safeTimeMs = Math.max(0, Math.floor(payload.timeMs));

    if (!this.tags[stat]) {
      this.tags[stat] = [];
    }

    this.tags[stat] = [...this.tags[stat], safeTimeMs];

    return {
      stat,
      timeMs: safeTimeMs,
    };
  }

  clearTags() {
    this.tags = {};
  }

  replaceTags(nextTags) {
    if (!nextTags || typeof nextTags !== "object" || Array.isArray(nextTags)) {
      this.tags = {};
      return;
    }

    const groupedTags = {};

    for (const [label, times] of Object.entries(nextTags)) {
      if (!Array.isArray(times)) {
        continue;
      }

      const safeTimes = times
        .filter((timeMs) => Number.isFinite(timeMs))
        .map((timeMs) => Math.max(0, Math.floor(timeMs)));

      if (safeTimes.length > 0) {
        groupedTags[label] = safeTimes;
      }
    }

    this.tags = groupedTags;
  }
}

module.exports = {
  TagStore,
};
