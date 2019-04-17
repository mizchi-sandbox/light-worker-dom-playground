import { Cursor } from "./types";

export function getCursorFromRoot(target: Node, root: Node): Cursor {
  if (target === root) {
    return [];
  }
  // if (!isChildOfRoot(target, root)) {
  //   throw new Error('Is not child of root')
  // }
  if (target == null) {
    throw new Error("not valid root");
  } else {
    if (target.parentElement === root) {
      return [0];
    }
    if (target.parentElement) {
      const indexFromParent = Array.from(
        target.parentElement.childNodes
      ).indexOf(target as ChildNode);
      return [
        ...getCursorFromRoot(target.parentElement, root),
        indexFromParent
      ];
    }
    throw new Error("not valid root");
  }
}

export function getNodeByCursor(cursor: Cursor, root: Node): Node {
  let cur: Node = root;
  for (const idx of cursor) {
    cur = cur.childNodes[idx];
  }
  return cur;
}

export function isChildOfRoot(node: Node, root: Node) {
  if (node === root) {
    return true;
  }

  let cur: any = node;
  while ((cur = cur.parentElement)) {
    if (cur === document.body) {
      return false;
    }
    if (cur === root) {
      return true;
    }
  }
  return false;
}
