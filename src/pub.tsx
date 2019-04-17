import { uniqueId } from "lodash";
import React, { useState } from "react";
import ReactDOM from "react-dom";
import io from "socket.io-client";
import { Cursor, SerializedMutationRecord } from "./types";
import { isChildOfRoot, getCursorFromRoot, getNodeByCursor } from "./shared";

const rootElement = document.querySelector(".root") as HTMLElement;

function serializeMutationRecord(
  record: MutationRecord,
  host: HTMLElement,
  cursorMap: Map<Node, Cursor>
): SerializedMutationRecord {
  switch (record.type) {
    case "characterData": {
      const text = record.target as Text;
      // console.log("char", record.target.data);
      return {
        type: record.type,
        targetCursor: getCursorFromRoot(record.target, host),
        value: text.data
      };
    }
    case "attributes": {
      return {
        type: record.type,
        targetCursor: getCursorFromRoot(record.target, host),
        attributeName: record.attributeName,
        oldValue: record.oldValue,
        value: host.getAttribute(record.attributeName as string)
      } as SerializedMutationRecord;
    }
    case "childList": {
      return {
        type: record.type,
        targetCursor: getCursorFromRoot(record.target, host),
        removedNodesCursors:
          record.removedNodes &&
          Array.from(record.removedNodes).map(removedNode =>
            cursorMap.get(removedNode)
          ),
        addedNodesData:
          record.addedNodes &&
          Array.from(record.addedNodes).map(addedNode => ({
            tag: (addedNode as Element).tagName.toLowerCase(),
            attributes: Object.entries(
              (addedNode as Element).attributes
            ).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
            html: (addedNode as Element).innerHTML
          })),
        previousSiblingCursor:
          record && cursorMap.get(record.previousSibling as Node),
        nextSiblingCursor: record && cursorMap.get(record.nextSibling as Node)
      } as SerializedMutationRecord;
    }
  }
}

class SyncSource {
  private lastCursorMap: Map<Node, Cursor> = new Map();

  constructor(private root: HTMLElement) {}

  startSync(onUpdate: (serialized: SerializedMutationRecord[]) => void) {
    new MutationObserver((mutations: MutationRecord[]) => {
      const serialized = Array.from(mutations)
        .filter(mut => {
          return isChildOfRoot(mut.target, rootElement);
        })
        .map(mut =>
          serializeMutationRecord(mut, rootElement, this.lastCursorMap)
        );
      this.rebuildCursorMap();
      onUpdate(JSON.parse(JSON.stringify(serialized)));
    }).observe(document.body, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
      attributeOldValue: true,
      characterDataOldValue: true
    });
  }

  private rebuildCursorMap() {
    this.lastCursorMap.clear();
    const walk = (node: Node) => {
      const cursor = getCursorFromRoot(node, this.root);
      this.lastCursorMap.set(node, cursor);
      Array.from(node.childNodes).forEach(child => walk(child));
    };
    walk(this.root);
  }
}

function NodeList(props: { value: number; onClickSelf: () => void }) {
  const [children, setChildren] = useState<string[]>([]);
  const [counter, setCounter] = useState(0);
  return (
    <div>
      <button onClick={() => setCounter(s => s + 1)}>{counter}</button>
      <button
        onClick={() => {
          setChildren([...children, uniqueId() as string]);
        }}
      >
        add
      </button>

      <button
        onClick={() => {
          setChildren([]);
        }}
      >
        clear
      </button>
      <button onClick={props.onClickSelf}>remove self</button>

      <span>{props.value}</span>

      <ul>
        {children.map((i, index) => {
          return (
            <NodeList
              key={i}
              value={i as any}
              onClickSelf={() => {
                const newChildren = children.filter(
                  (_, cidx) => cidx !== index
                );
                setChildren(newChildren);
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}

function App() {
  return <NodeList value={0} onClickSelf={() => {}} />;
}

const source = new SyncSource(rootElement);
const socket = io.connect("http://localhost:8123");

function handleRemoteEvent(event: { type: string; targetCursor: Cursor }) {
  if (event.type === "click") {
    const newEvent = new MouseEvent(event.type, {
      view: window,
      cancelable: true,
      bubbles: true
    });
    const target = getNodeByCursor(event.targetCursor, rootElement);
    target.dispatchEvent(newEvent);
  }
}

window.addEventListener("scroll", () => {
  console.log("scrolled", window.scrollY);
  socket.emit("sync:scroll", window.scrollY);
});

socket.on("server-request-state-to-host", () => {
  socket.emit("host-return-state", rootElement.innerHTML);
});

socket.on("server:broadcast-event", (event: any) => {
  handleRemoteEvent(event);
});
source.startSync(serialized => {
  socket.emit("host-update-records", {
    serialized
  });
});
ReactDOM.render(<App />, rootElement);
