import React, { useState, useEffect } from 'react';


// needs to be written to the json file as well


type Listener = () => void;

class TagMap {
  private tags = new Map<string, string>();
  private listeners = new Set<Listener>();

  addTagTest = () => {
    this.tags.set("test", "works");
    this.emit();
  };

  getTags() {
    return this.tags;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {this.listeners.delete(listener)}; // unsubscribe
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
      console.log("this is running")
    }
  }
}

export const tagMap = new TagMap();



export function useAddTag() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = tagMap.subscribe(() => {
      setVersion((v) => v + 1); // trigger React update
      console.log("subscription has triggered")
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    console.log("tagMap changed:", tagMap.getTags());
  }, [version]);

  return {
    addTag: tagMap.addTagTest,
    tags: tagMap.getTags(),
  };
}