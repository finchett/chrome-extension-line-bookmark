class Pin {
  constructor(x, y, index, topScroll, note = "") {
    this.index = index;
    this.x = x;
    this.y = y;
    this.topScroll = topScroll;
    this.note = note;
    this.stick = false;

    this.createElements();
    document.documentElement.appendChild(this.pinParent);
  }

  createElements() {
    // Create parent container
    this.pinParent = document.createElement("div");
    this.pinParent.classList.add("pin-parent");
    this.pinParent.style.left = `${this.x - 9.5}px`;
    this.pinParent.style.top = `${this.y - 20}px`;

    // Create the pin element.
    this.pin = document.createElement("div");
    this.pin.className = "pin-line-bookmark bounceIn-line-bookmark";
    this.pin.setAttribute("data-index", this.index);
    this.pin.addEventListener("mouseenter", this.handlePinMouseEnter.bind(this));
    this.pin.addEventListener("mouseenter", () => this.pin.classList.add("hover"));
    this.pin.addEventListener("mouseleave", () => this.pin.classList.remove("hover"));
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

// Global Stuff
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

function addNewPin(x, y) {
  const pin = new Pin(x, y, generateId(), document.documentElement.scrollTop);
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
  const pinData = pins.map(({ x, y, index, topScroll, note }) => ({ x, y, index, topScroll, note }));
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
        const pin = new Pin(data.x, data.y, data.index, data.topScroll, data.note);
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

function scrollToNextPin() {
  if (pins.length === 0) return;

  const sortedPins = [...pins].sort((a, b) => a.y - b.y);

  let nextPinIndex = 0;
  let previousPinIndex = -1;

  if (sortedPins.length > 1) {
    nextPinIndex = sortedPins.findIndex((pin) => pin.y > window.scrollY + 120)

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
      top: nextPin.y - offset,
      behavior: "smooth",
    });
  }
}
