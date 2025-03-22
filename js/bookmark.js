class Pin {
  constructor(anchorSelector, x, y, index, note = "") {
    this.index = index;
    this.anchorSelector = anchorSelector
    this.x = x;
    this.y = y;
    this.note = note;
    this.stick = false;

    this.createParent()
    this.refreshAnchor()
    this.refreshPosition()
    this.createElements();
    document.documentElement.appendChild(this.pinParent);
  }

  refreshAnchor() {
    this.anchor = getAnchorFromSelector(this.anchorSelector)
    this.anchor.classList.add('pin-anchor')
  }

  highlightAnchor() {
    this.anchor.classList.add('anchor-highlight');
  }

  unlightAnchor() {
    this.anchor.classList.remove('anchor-highlight');
  }

  refreshPosition() {
    const margins = 15;
    this.position = getOffsetPosition(this.anchor, this.x, this.y)
    this.pinParent.style.left = `${Math.max(margins, Math.min(this.position.x - 9.5, (window.innerWidth - (margins + 20))))}px`;
    this.pinParent.style.top = `${Math.max(this.position.y - 20, margins)}px`;
  }

  createParent() {
    this.pinParent = document.createElement("div");
    this.pinParent.classList.add("pin-parent");
  }

  createElements() {

    // Create the pin element.
    this.pin = document.createElement("div");
    this.pin.className = "pin-line-bookmark bounceIn-line-bookmark";
    this.pin.setAttribute("data-index", this.index);
    this.pin.addEventListener("mouseenter", this.handlePinMouseEnter.bind(this));
    this.pin.addEventListener("mouseenter", () => this.pin.classList.add("hover"));
    this.pin.addEventListener("mouseleave", () => this.pin.classList.remove("hover"));
    this.pin.addEventListener("mouseleave", this.handlePinMouseLeave.bind(this));
    this.pin.addEventListener("click", (e) => {
      e.stopPropagation();
      removePin(this.pin);
    });

    this.pinParent.appendChild(this.pin);

    // Create the note container.
    this.noteDiv = document.createElement("div");
    this.noteDiv.className = "note-line-bookmark";
    this.noteDiv.addEventListener("mouseenter", () => clearTimeout(this.mouseleaveTimeout));
    this.noteDiv.addEventListener("click", (e) => {
      this.stick = true;
      e.stopPropagation();
    });
    this.noteDiv.addEventListener("mouseup", (e) => e.stopPropagation());
    this.pinParent.addEventListener("mouseleave", () => {
      if (!this.stick) this.hideNote();
    });

    this.pinParent.appendChild(this.noteDiv);

    // Create the editable note text.
    this.noteText = document.createElement("div");
    this.noteText.className = "noteText-line-bookmark";
    this.noteText.setAttribute("contenteditable", "true");
    this.noteText.setAttribute("placeholder", "Write a note...");
    this.noteText.innerHTML = this.note;
    this.noteText.addEventListener("keyup", () => this.updateNote());
    this.noteDiv.appendChild(this.noteText);
  }

  handlePinMouseEnter() {
    this.showNote();
    this.highlightAnchor();
  }

  handlePinMouseLeave() {
    this.unlightAnchor()
  }

  showNote() {
    if (!this.pinParent || !this.noteDiv) return;

    this.noteDiv.style.display = "block"

    const pinRect = this.pinParent.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Temporarily reset marginLeft to get accurate note width.
    // Note actually here needed but makes it easier to handle dynamic widths
    const originalMarginLeft = this.noteDiv.style.marginLeft;
    this.noteDiv.style.marginLeft = "0px";
    const noteWidth = this.noteDiv.offsetWidth;
    this.noteDiv.style.marginLeft = originalMarginLeft;

    // Adjust note position if it would overflow the viewport.
    const newMarginLeft =
      pinRect.left + noteWidth + 20 > viewportWidth ? `-${noteWidth - 20}px` : "0px";

    this.noteDiv.style.marginLeft = newMarginLeft;
    this.noteDiv.classList.add("fadeIn");

    // The fadeIn class already controls visibility via CSS.
    this.noteDiv.style.visibility = "visible";
  }

  hideNote() {
    if (!this.pinParent) return;
    this.noteDiv.classList.remove("fadeIn");
    this.stick = false;

    setTimeout(() => {
      this.noteDiv.style.display = "none";
    }, 200);
  }

  updateNote() {
    delay(() => {
      this.note = this.noteText.innerHTML;
      savePins();
    }, 1000);
  }

  removeElement() {
    if (!this.pinParent) return;
    const removeElements = () => {
      this.pin.remove();
      this.noteDiv.remove();
      this.noteText.remove();
      this.pinParent.remove();
      this.pinParent = null;
    };

    if (this.noteDiv.classList.contains("fadeIn")) {
      this.noteDiv.addEventListener("transitionend", removeElements, { once: true });
    } else {
      removeElements();
    }
  }
}

const pins = [];

let altKeyPressed = false;
const generateId = (() => {
  let id = 0;
  return () => id++;
})();

document.documentElement.addEventListener("click", (e) => {
  if (altKeyPressed) {
    handleAltClick(e);
    e.stopPropagation();
  }
});

document.documentElement.addEventListener("mouseup", (e) => {
  pins.forEach((pin) => {
    if (pin.noteDiv && pin.noteDiv.classList.contains("fadeIn") && !pin.noteDiv.contains(e.target)) {
      pin.hideNote();
    }
  });
});

document.documentElement.addEventListener("keydown", (e) => {
  if (e.altKey) altKeyPressed = true;
});

document.documentElement.addEventListener("keyup", () => {
  altKeyPressed = false;
});

function handleAltClick(e) {
  if (
    !isNearExistingPin(e.pageX, e.pageY) &&
    !e.target.closest(".noteText-line-bookmark, .note-line-bookmark")
  ) {
    addNewPin(e.pageX, e.pageY);
  }
}

function getOffsetPosition(element, offsetX, offsetY) {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const x = rect.left + window.scrollX + offsetX;
  const y = rect.top + window.scrollY + offsetY;

  return { x, y };
}

const getUniqueSelector = (el) => {
  let path = [], parent;
  while (parent = el.parentNode) {
    path.unshift(`${el.tagName}:nth-child(${[].indexOf.call(parent.children, el) + 1})`);
    el = parent;
  }
  return `${path.join(' > ')}`.toLowerCase();
};

// distance but preferes y over x
function yeuclideanDistance(x1, y1, x2, y2) {
  return Math.sqrt(((x2 - x1) ** 2) * 0.1 + (y2 - y1) ** 2);
}

function getScrollAnchor(x, y) {
  // select candidate elements. Adjust the selector to match elements you expect to be anchors.
  const candidates = Array.from(document.querySelectorAll('p, section, article, body, main'));

  let anchor = null;
  let minDistance = Infinity;
  let ox = null;
  let oy = null;

  candidates.forEach(el => {
    const rect = el.getBoundingClientRect();
    
    // Only consider elements that are actually visible.
    if (rect.width === 0 || rect.height === 0) return;
    // We want elements at least partially in the viewport.
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;

    // Calculate distance from the top of the viewport. You can adjust to use rect.top directly
    // if you only want elements below or at the top.

    const ex = rect.left + window.scrollX;
    const ey = rect.top + window.scrollY;

    const distance = Math.abs(yeuclideanDistance(ex, ey, x, y));
    if (distance < minDistance) {
      minDistance = distance;
      anchor = el;
      ox = x - ex;
      oy = y - ey;
    }
  });

  return { anchor: anchor, x: ox, y: oy };
}

function getAnchorFromSelector(anchorSelector) {
  return document.querySelector(anchorSelector);
}

function addNewPin(x, y) {

  const anchorElement = getScrollAnchor(x, y)
  const anchorSelector = getUniqueSelector(anchorElement.anchor)
  const verifySelector = document.querySelector(anchorSelector);

  const pin = new Pin(anchorSelector, anchorElement.x, anchorElement.y, generateId());

  pin.showNote();
  pins.push(pin);
  savePins();
}

function removePin(target) {
  target.classList.add("remove-pin-line-bookmark");
  setTimeout(() => {
    const pinIndex = pins.findIndex((pin) => pin.index == target.getAttribute("data-index"));
    if (pinIndex !== -1) {
      const [removedPin] = pins.splice(pinIndex, 1);
      removedPin.unlightAnchor();
      removedPin.removeElement();
    }
    target.remove();
    savePins();
  }, 200);
}

function isNearExistingPin(x, y) {
  return pins.some((pin) => Math.hypot(x - pin.x, y - pin.y) < 10);
}

function savePins() {
  const pinData = pins.map(({ anchorSelector, x, y, index, note }) => ({ anchorSelector, x, y, index, note }));
  const cleanUrl = window.location.origin + window.location.pathname;

  chrome.storage.local.set({ [cleanUrl]: pinData });
}


let delayTimer;
function delay(callback, ms) {
  clearTimeout(delayTimer);
  delayTimer = setTimeout(callback, ms);
}

// chrome.runtime message handling.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "getStatus":
      sendResponse(pins.length > 0 ? "full" : "empty");
      break;
    case "remove":
      removeAllPins();
      sendResponse("done");
      break;
    default:
      console.error("Unrecognized message:", message);
  }
});

function removeAllPins() {
  pins.forEach((pin) => pin.removeElement());
  pins.length = 0;
  const cleanUrl = window.location.origin + window.location.pathname;
  chrome.storage.local.remove(cleanUrl);
}


function loadPins() {
  const cleanUrl = window.location.origin + window.location.pathname;
  chrome.storage.local.get(cleanUrl, (result) => {
    if (result[cleanUrl]) {
      const pinData = result[cleanUrl];


      pinData.forEach((data) => {
        const pin = new Pin(data.anchorSelector, data.x, data.y, data.index, data.note);
        pins.push(pin);
      });
    }
  });
}

window.addEventListener("load", loadPins);

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "x") {
    scrollToNextPin();
  }
});

window.addEventListener("resize", () => {
  pins.forEach(pin => {
    pin.refreshPosition()
  })
});


function scrollToNextPin() {
  if (pins.length === 0) return;

  const sortedPins = [...pins].sort((a, b) => a.position.y - b.position.y);

  let nextPinIndex = 0;
  let previousPinIndex = -1;

  if (sortedPins.length > 1) {
    nextPinIndex = sortedPins.findIndex((pin) => pin.position.y > window.scrollY + 120)

    if (nextPinIndex == -1) {
      previousPinIndex = sortedPins.length - 1
      nextPinIndex = 0
    } else {
      previousPinIndex = nextPinIndex - 1
    }
  }

  const nextPin = sortedPins[nextPinIndex];

  if (previousPinIndex > 0) {
    const previousPin = sortedPins[previousPinIndex];
    previousPin.hideNote()
  }

  if (nextPin) {
    if (nextPin.note !== "") nextPin.showNote();
    const offset = 100;
    window.scrollTo({
      top: nextPin.position.y - offset,
      behavior: "smooth",
    });
  }
}
