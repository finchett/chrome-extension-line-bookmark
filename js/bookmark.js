class Pin {
  constructor(x, y, index, topScroll, note = "") {
    this.index = index;
    this.x = x;
    this.y = y;
    this.topScroll = topScroll;
    this.note = note;
    this.scrollFrom = false;
    this.stick = false;

    this.createElements();
    document.documentElement.appendChild(this.pinParent);

  }

  createElements() {
    this.pinParent = document.createElement("div");
    this.pinParent.style.overflow = 'visible';
    this.pinParent.style.zIndex = '100';
    this.pinParent.style.left = `${this.x - 9.5}px`;
    this.pinParent.style.top = `${this.y - 20}px`;
    this.pinParent.style.position = "absolute";

    this.pin = document.createElement("div");
    this.pin.className = "pin-line-bookmark bounceIn-line-bookmark";
    this.pin.setAttribute("index", this.index);
    this.pin.addEventListener("mouseenter", () => this.showNote());

    this.pinParent.appendChild(this.pin);

    this.pin.addEventListener("mouseenter", () => {
      this.pin.classList.add("hover");
    });
    this.pin.addEventListener("mouseleave", () => {
      this.pin.classList.remove("hover");
    });

    this.pin.addEventListener("click", (e) => {
      e.stopPropagation();
      removePin(this.pin);
    });

    this.noteDiv = document.createElement("div");
    this.noteDiv.addEventListener("mouseenter", () => {
      clearTimeout(this.mouseleaveTimeout);
    });
    this.noteDiv.addEventListener("click", (e) => {
      this.stick = true;
      e.stopPropagation();
    });

    this.noteDiv.addEventListener("mouseup", (e) => {
      e.stopPropagation();
    });

    this.pinParent.addEventListener("mouseleave", (e) => {
      if (!this.stick) {
        this.hideNote()
      }
    })

    this.noteDiv.className = "note-line-bookmark";
    this.pinParent.appendChild(this.noteDiv);

    this.noteText = document.createElement("div");
    this.noteText.className = "noteText-line-bookmark";
    this.noteText.setAttribute("contenteditable", "true");
    this.noteText.setAttribute("placeholder", "Write a note...");
    this.noteText.innerHTML = this.note;
    this.noteText.addEventListener("keyup", () => this.updateNote());
    this.noteDiv.appendChild(this.noteText);
  }

  showNote() {
    if (!this.pinParent || !this.noteDiv) return;

    const pinRect = this.pinParent.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Temporarily reset marginLeft to 0 to get accurate width
    const originalMarginLeft = this.noteDiv.style.marginLeft;
    this.noteDiv.style.marginLeft = '0px';

    const noteWidth = this.noteDiv.offsetWidth;

    this.noteDiv.style.marginLeft = originalMarginLeft; // Restore original margin

    let newMarginLeft;
    if (pinRect.left + noteWidth + 20 > viewportWidth) {
      newMarginLeft = `-${noteWidth - 20}px`;
    } else {
      newMarginLeft = `-0px`;
    }

    if (this.noteDiv.style.marginLeft !== newMarginLeft) {
      this.noteDiv.style.marginLeft = newMarginLeft;
    }

    this.noteDiv.classList.add("fadeIn");
    this.noteDiv.style.visibility = 'visible';
  }

  hideNote() {
    if (!this.pinParent) return;
    this.noteDiv.classList.remove("fadeIn");
    this.stick = false;
  }

  updateNote() {
    delay(() => {
      this.note = this.noteText.innerHTML;
      savePins();
    }, 1000);
  }

  removeElement() {
    if (this.pinParent) {
      if (this.noteDiv.classList.contains('fadeIn')) {
        this.noteDiv.addEventListener('transitionend', () => {
          this.pin.remove();
          this.noteDiv.remove();
          this.noteText.remove();
          this.pinParent.remove();
          this.pinParent = null;
        }, { once: true });
      } else {
        this.pin.remove();
        this.noteDiv.remove();
        this.noteText.remove();
        this.pinParent.remove();
        this.pinParent = null;
      }
    }
  }
}

const pins = [], filtered = [];
let alt = false;
const id = (() => { let i = 0; return () => i++; })();

document.documentElement.addEventListener("click", (e) => {
  if (alt) {
    handleAltClick(e);
    e.stopPropagation();
  }
});

document.documentElement.addEventListener("mouseup", (e) => {
  pins.forEach(pin => {
    if (pin.noteDiv && pin.noteDiv.classList.contains('fadeIn') && !pin.noteDiv.contains(e.target)) {
      pin.hideNote();
    }
  });
});

document.documentElement.addEventListener("keydown", (e) => {
  if (e.altKey) alt = true;
});

document.documentElement.addEventListener("keyup", () => { alt = false; });

function handleAltClick(e) {
  if (!isNearExistingPin(e.pageX, e.pageY) && !e.target.closest(".noteText-line-bookmark, .note-line-bookmark")) {
    addNewPin(e.pageX, e.pageY);
  }
}

function addNewPin(x, y) {
  const pin = new Pin(x, y, id(), document.documentElement.scrollTop);
  pin.showNote();
  pins.push(pin);
  savePins();
}

function removePin(target) {
  target.classList.add("remove-pin-line-bookmark");
  setTimeout(() => {
    const index = pins.findIndex(pin => pin.index == target.getAttribute("index"));
    if (index !== -1) {
      const pinInstance = pins[index];
      pins.splice(index, 1);
      pinInstance.removeElement();
      pins.removeItem(index)
    }
    target.remove();
    savePins();
  }, 200);
}

function isNearExistingPin(x, y) {
  return pins.some(pin => Math.hypot(x - pin.x, y - pin.y) < 10);
}

function savePins() {
  localStorage.setItem(window.location.href, JSON.stringify(pins));
  if (pins.length === 0) localStorage.removeItem(window.location.href);
}

function delay(callback, ms) {
  clearTimeout(this.timer);
  this.timer = setTimeout(callback, ms);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "getStatus":
      sendResponse(localStorage.getItem(window.location.href) ? "full" : "empty");
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
  pins.forEach(pin => pin.removeElement());
  pins.length = 0;
  localStorage.removeItem(window.location.href);
}

function loadPins() {
  const storedPins = localStorage.getItem(window.location.href);
  if (storedPins) {
    const pinData = JSON.parse(storedPins);
    pinData.forEach(data => {
      const pin = new Pin(data.x, data.y, data.index, data.topScroll, data.note, data.stick);
      pins.push(pin);
    });
  }
}

window.addEventListener('load', loadPins);


document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'x') {
    scrollToNextPin();
  }
});

function scrollToNextPin() {
  if (pins.length === 0) return;

  // Sort pins by their y-coordinate
  const sortedPins = pins.slice().sort((a, b) => a.y - b.y);

  // Determine the index of the next pin in the sorted array
  let nextIndex = 0; // Default to the first pin

  if (pins.length > 1) {
    // Find the currently active pin index
    const currentActivePin = sortedPins.find(pin => pin.y > window.scrollY) || sortedPins[sortedPins.length - 1];
    let currentActiveIndex = sortedPins.indexOf(currentActivePin);

    // Calculate the next index, wrapping around to the beginning if necessary
    nextIndex = (currentActiveIndex + 1) % sortedPins.length;
    currentActivePin.hideNote()
  }


  const nextPin = sortedPins[nextIndex];

  if (nextPin) {
    if (nextPin.note != "") {
      nextPin.showNote()

    }
    const offset = 100;
    window.scrollTo({
      top: nextPin.y - offset,
      behavior: 'smooth'
    });
  }
}