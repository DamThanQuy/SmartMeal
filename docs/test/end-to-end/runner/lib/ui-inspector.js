/**
 * lib/ui-inspector.js
 * Independent XML Inspector for Android UI Automator dumps.
 * Parses UI nodes, finds elements by criteria (text, content-desc, resource-id),
 * and computes exact touch bounds for adb tapping.
 */
'use strict';

/**
 * Parse a bounds string of the form "[x1,y1][x2,y2]" into coordinate values and center.
 * @param {string} boundsStr - e.g. "[100,200][400,300]"
 * @returns {{ x: number, y: number, x1: number, y1: number, x2: number, y2: number, width: number, height: number }|null}
 */
function parseBounds(boundsStr) {
  if (!boundsStr || typeof boundsStr !== 'string') return null;
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;

  const x1 = parseInt(match[1], 10);
  const y1 = parseInt(match[2], 10);
  const x2 = parseInt(match[3], 10);
  const y2 = parseInt(match[4], 10);

  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);
  const x = Math.round(x1 + width / 2);
  const y = Math.round(y1 + height / 2);

  return { x, y, x1, y1, x2, y2, width, height };
}

/**
 * Extract attribute key-value pairs from a tag opening string.
 * @param {string} tagStr
 * @returns {Record<string, string>}
 */
function extractAttributes(tagStr) {
  const attrs = {};
  const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(tagStr)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

/**
 * Parse an entire UI Automator XML string into a flat list of node objects.
 * Works natively in Node.js without any third-party XML parser.
 * @param {string} xml
 * @returns {Array<object>}
 */
function parseAllNodes(xml) {
  if (!xml || typeof xml !== 'string') return [];
  const nodes = [];
  // Match each <node ...> or <node .../>
  const nodeTagRegex = /<node\s+([^>]+?)(\/?>)/g;
  let match;

  while ((match = nodeTagRegex.exec(xml)) !== null) {
    const rawAttrs = match[1];
    const attrs = extractAttributes(rawAttrs);
    const boundsStr = attrs.bounds || '';
    const center = parseBounds(boundsStr);

    nodes.push({
      index: attrs.index !== undefined ? parseInt(attrs.index, 10) : undefined,
      text: attrs.text || '',
      resourceId: attrs['resource-id'] || '',
      className: attrs.class || '',
      package: attrs.package || '',
      contentDesc: attrs['content-desc'] || '',
      checkable: attrs.checkable === 'true',
      checked: attrs.checked === 'true',
      clickable: attrs.clickable === 'true',
      enabled: attrs.enabled === 'true',
      focusable: attrs.focusable === 'true',
      focused: attrs.focused === 'true',
      scrollable: attrs.scrollable === 'true',
      longClickable: attrs['long-clickable'] === 'true',
      password: attrs.password === 'true',
      selected: attrs.selected === 'true',
      bounds: boundsStr,
      center,
      x: center ? center.x : null,
      y: center ? center.y : null
    });
  }

  return nodes;
}

/**
 * Test whether a node matches the given criteria.
 * @param {object} node
 * @param {string|RegExp|object} criteria
 * @returns {boolean}
 */
function matchNode(node, criteria) {
  if (!criteria) return false;

  // Simple string search: matches text or contentDesc (case-insensitive)
  if (typeof criteria === 'string') {
    const target = criteria.toLowerCase();
    const nodeText = (node.text || '').toLowerCase();
    const nodeDesc = (node.contentDesc || '').toLowerCase();
    return nodeText.includes(target) || nodeDesc.includes(target);
  }

  // RegExp match against text or contentDesc
  if (criteria instanceof RegExp) {
    return criteria.test(node.text || '') || criteria.test(node.contentDesc || '');
  }

  // Object criteria: { text, contentDesc, resourceId, className, clickable, exact }
  if (typeof criteria === 'object') {
    const exact = Boolean(criteria.exact);

    if (criteria.text !== undefined) {
      if (criteria.text instanceof RegExp) {
        if (!criteria.text.test(node.text || '')) return false;
      } else if (exact) {
        if ((node.text || '') !== criteria.text) return false;
      } else {
        if (!(node.text || '').toLowerCase().includes(criteria.text.toLowerCase())) return false;
      }
    }

    if (criteria.contentDesc !== undefined) {
      if (criteria.contentDesc instanceof RegExp) {
        if (!criteria.contentDesc.test(node.contentDesc || '')) return false;
      } else if (exact) {
        if ((node.contentDesc || '') !== criteria.contentDesc) return false;
      } else {
        if (!(node.contentDesc || '').toLowerCase().includes(criteria.contentDesc.toLowerCase())) return false;
      }
    }

    if (criteria.resourceId !== undefined) {
      if (criteria.resourceId instanceof RegExp) {
        if (!criteria.resourceId.test(node.resourceId || '')) return false;
      } else if (exact) {
        if ((node.resourceId || '') !== criteria.resourceId) return false;
      } else {
        if (!(node.resourceId || '').toLowerCase().includes(criteria.resourceId.toLowerCase())) return false;
      }
    }

    if (criteria.className !== undefined) {
      if ((node.className || '') !== criteria.className) return false;
    }

    if (criteria.clickable !== undefined) {
      if (node.clickable !== criteria.clickable) return false;
    }

    if (criteria.query !== undefined) {
      const q = criteria.query.toLowerCase();
      const nodeText = (node.text || '').toLowerCase();
      const nodeDesc = (node.contentDesc || '').toLowerCase();
      if (!nodeText.includes(q) && !nodeDesc.includes(q)) return false;
    }

    return true;
  }

  return false;
}

/**
 * Find the first node in an XML dump matching criteria.
 * @param {string} xml - raw uiautomator XML string
 * @param {string|RegExp|object} criteria - query matching text, content-desc, or resource-id
 * @returns {object|null} matching node with center coordinates, or null
 */
function findElement(xml, criteria) {
  const nodes = parseAllNodes(xml);
  for (const node of nodes) {
    if (matchNode(node, criteria)) {
      return node;
    }
  }
  return null;
}

/**
 * Find all nodes in an XML dump matching criteria.
 * @param {string} xml
 * @param {string|RegExp|object} criteria
 * @returns {Array<object>}
 */
function findElements(xml, criteria) {
  const nodes = parseAllNodes(xml);
  return nodes.filter(node => matchNode(node, criteria));
}

module.exports = {
  parseBounds,
  parseAllNodes,
  findElement,
  findElements
};
