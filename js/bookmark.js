class Pin {
  constructor(x, y, index, topScroll, note = "") {
    this.index = index;
    this.x = x;
    this.y = y;
    this.topScroll = topScroll;
    this.note = note;
    this.scrollFrom = false;
    this.stay = false;

    this.createElements();
    document.documentElement.appendChild(this.pinParent);
  }

  createElements() {
    this.pinParent = document.createElement("div")
    this.pinParent.style.overflow = 'visible'
    this.pinParent.style.zIndex = '100';
    this.pinParent.style.left = `${this.x - 9.5}px`;
    this.pinParent.style.top = `${this.y - 20}px`;
    this.pinParent.style.position = "absolute";
    
    this.pin = document.createElement("div");
    this.pin.className = "pin-line-bookmark bounceIn-line-bookmark";
    this.pin.setAttribute("index", this.index);
    this.pinParent.addEventListener("mouseenter", () => this.showNote());
    this.pinParent.addEventListener("mouseleave", () => {
      if (!this.stick) {
        this.hideNote()
      }

      });

    this.pinParent.appendChild(this.pin);

    // Change the pin icon on hover to close/delete icon
    this.pin.addEventListener("mouseenter", () => {
      this.pin.classList.add("hover");
    });
    this.pin.addEventListener("mouseleave", () => {
      this.pin.classList.remove("hover");
    });

    this.pin.addEventListener("click", (e) => {
      e.stopPropagation()
      removePin(this.pin)
    })

    this.noteDiv = document.createElement("div");
    this.noteDiv.addEventListener("click", (e) => {
      this.stick = true;
      e.stopPropagation();
    })

    this.noteDiv.addEventListener("mouseup", (e) => {
      e.stopPropagation();
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
    this.noteDiv.classList.add("fadeInUp-line-bookmark");
    this.noteDiv.classList.remove("fadeOutDown-line-bookmark");
  }

  hideNote() {
    this.noteDiv.classList.remove("fadeInUp-line-bookmark");
    this.noteDiv.classList.add("fadeOutDown-line-bookmark");
  }

  updateNote() {
    delay(() => {
      this.note = this.noteText.innerHTML;
      savePins();
    }, 1000);
  }

  removeElement() {
    this.pin.remove();
    this.pinParent.remove();
    this.noteDiv.style.display = "none";
    this.noteDiv.style.visibility = "hidden";
    this.noteDiv.remove();
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

document.documentElement.addEventListener("mouseup", () => {
  document.querySelectorAll(".note-line-bookmark").forEach(note => {
    note.classList.remove("fadeInUp-line-bookmark");
    note.classList.add("fadeOutDown-line-bookmark");
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
  pins.push(pin);
  savePins();
}

function removePin(target) {
  target.classList.add("remove-pin-line-bookmark");
  setTimeout(() => {
    const index = pins.findIndex(pin => pin.index == target.getAttribute("index"));
    if (index !== -1) pins.splice(index, 1);
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