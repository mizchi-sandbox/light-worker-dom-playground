export type Cursor = number[];

export type DeserializedMutationRecord =
  | {
      type: 'childList';
      target: Node;
      addedNodes: Node[];
      removedNodes: Node[];
      previousSibling: Node | void;
      nextSibling: Node | void;
    }
  | {
      type: 'characterData';
      target: Node;
      value: string;
    }
  | {
      type: 'attributes';
      target: Node;
      attributeName: string;
      oldValue: string;
      value: string;
    };

export type SerializedMutationRecord =
  | {
      type: 'childList';
      targetCursor: Cursor;
      removedNodesCursors: Cursor[];
      addedNodesData: {
        tag: string;
        attributes: object;
        html: string;
      }[];
      previousSiblingCursor: Cursor | void;
      nextSiblingCursor: Cursor | void;
    }
  | {
      type: 'characterData';
      targetCursor: Cursor;
      value: string;
    }
  | {
      type: 'attributes';
      targetCursor: Cursor;
      attributeName: string;
      oldValue: string;
      value: string;
    };
