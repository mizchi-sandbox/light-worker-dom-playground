import io from "socket.io-client";
import { SerializedMutationRecord, DeserializedMutationRecord } from "./types";
import { getNodeByCursor, isChildOfRoot, getCursorFromRoot } from "./shared";

const rootElement = document.querySelector(".root") as HTMLElement;

const socket = io.connect("http://localhost:8123");

let startSynced = false;

socket.on("connected", (_msg: {}) => {
  socket.emit("guest-request-host-state", {});
});

socket.on("synced:scroll", (scrollY: number) => {
  window.scrollTo({ top: scrollY });
});

socket.on(
  "server-bloadcast-records",
  (serialized: SerializedMutationRecord[]) => {
    if (!startSynced) {
      return;
    }
    sync(serialized);
  }
);

socket.on("sync-html", (html: string) => {
  // morphdom(outputNode, html);
  rootElement.innerHTML = html;
  startSynced = true;
  console.log("host synced html");
});

document.body.addEventListener("click", (ev: MouseEvent) => {
  console.log("click", ev);
  if (isChildOfRoot(ev.target as Element, rootElement)) {
    socket.emit("sub:send-event", serializeEvent(ev));
  }
});

function serializeEvent(ev: Event) {
  if (ev instanceof MouseEvent) {
    return {
      type: "click",
      targetCursor: getCursorFromRoot(ev.target as Node, rootElement)
    };
  }
}

function sync(serialized: SerializedMutationRecord[]) {
  // run
  const deserialized: DeserializedMutationRecord[] = serialized.map(
    (mut: SerializedMutationRecord) =>
      deserializeMutationRecord(mut, rootElement)
  );

  for (const mut of Array.from(deserialized)) {
    handleMutation(mut, rootElement);
  }
}

function deserializeMutationRecord(
  record: SerializedMutationRecord,
  host: HTMLElement
): DeserializedMutationRecord {
  switch (record.type) {
    case "characterData": {
      return {
        type: record.type,
        target: getNodeByCursor(record.targetCursor, host),
        value: record.value
      };
    }
    case "attributes": {
      return {
        type: record.type,
        target: getNodeByCursor(record.targetCursor, host) as any,
        attributeName: record.attributeName,
        oldValue: record.oldValue,
        value: record.value
      };
    }
    case "childList": {
      return {
        type: record.type,
        addedNodes: record.addedNodesData.map(data => {
          const el = document.createElement(data.tag);
          Object.entries(data.attributes).forEach(([k, v]) =>
            el.setAttribute(k, v)
          );
          el.innerHTML = data.html;
          return el;
        }),

        removedNodes: record.removedNodesCursors.map(n =>
          getNodeByCursor(n, host)
        ),
        target: getNodeByCursor(record.targetCursor, host),
        previousSibling:
          record.previousSiblingCursor &&
          getNodeByCursor(record.previousSiblingCursor, host),
        nextSibling:
          record.nextSiblingCursor &&
          getNodeByCursor(record.nextSiblingCursor, host)
      };
    }
  }
}

function handleMutation(mut: DeserializedMutationRecord, root: HTMLElement) {
  if (isChildOfRoot(mut.target, root)) {
    switch (mut.type) {
      case "attributes": {
        const targetOfOutput = mut.target;
        const newValue = (mut.target as Element).getAttribute(
          mut.attributeName
        ) as string;
        (targetOfOutput as Element).setAttribute(mut.attributeName, newValue);
        break;
      }
      case "characterData": {
        // const mapped = this.getMappedNode(mut.target);
        // const mapped = mut.target;
        if (mut.target) {
          mut.target.nodeValue = mut.value;
        }
        break;
      }
      case "childList": {
        // added
        if (mut.addedNodes.length > 0) {
          for (const addedNode of Array.from(mut.addedNodes)) {
            const newNode = addedNode.cloneNode(true);
            if (mut.nextSibling) {
              mut.target.insertBefore(newNode, mut.nextSibling);
            } else if (mut.previousSibling) {
              if (mut.previousSibling) {
                mut.target.insertBefore(
                  newNode,
                  mut.previousSibling.nextSibling
                );
              }
              mut.target.appendChild(newNode);
            } else {
              mut.target.appendChild(newNode);
            }
          }
        }
        // removed
        if (mut.removedNodes.length > 0) {
          for (const removedNode of Array.from(mut.removedNodes)) {
            const removedOnOut = removedNode;
            const targetOnOutput = mut.target;
            targetOnOutput.removeChild(removedOnOut);
          }
        }
      }
    }
  }
}
