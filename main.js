// amount of screen occupied by canvas
const WIDTH_PCT = 0.9;
const HEIGHT_PCT = 0.75;

const RETRY_TIME = 100;  // ms

// how much to zoom in/out when zooming
const ZOOM_FACTOR = 1.5;
// how much of the screen to move when panning
const MOVE_FACTOR = 0.2;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
updateCanvasSize();

class WorkerWrapper {
  constructor(id) {
    this.id = id;
    this.ready = false;
    this.worker = new Worker('./worker.js');
    this.worker.onmessage = this.receiveMessage.bind(this);
  }

  sendMessage(msg) {
    if (!this.ready) {
      throw new Error('worker is not ready');
    }
    this.worker.postMessage(msg);
    this.ready = false;
  }

  receiveMessage(msg) {
    if (msg.data.type === "ready") {
      console.log(`Worker ${this.id} is ready`);
      this.ready = true;
    }
    else if (msg.data.type === "render") {
      handleRenderResult(msg.data.data);
      this.ready = true;
    }
    else {
      console.log(`Worker ${this.id} sent unknown message:`);
      console.log(msg.data);
    }
  }
}

const n_workers = window.navigator.hardwareConcurrency || 4;
const workerWrappers = [];

let currentColors = [
  [0., 0., 0.],  // black
  [84., 147., 146.],  // teal
  [15., 15., 114.],  // blue
  [212., 135., 40.],  // orange
  [140., 10., 66.],  // burgundy
  [51., 3., 0.],  // dark red
];

function updateColorUI() {
  for (let i = 0; i < 6; i++) {
    const color = currentColors[i].map(x => Math.round(x));
    const hex = rgbToHex(color[0], color[1], color[2]);
    document.getElementById(`color-${i}`).value = hex;
  }
}

function randomColors() {
  const colors = [];
  for (let i = 0; i < 6; i++) {
    colors.push([
      Math.random() * 255,
      Math.random() * 255,
      Math.random() * 255,
    ]);
  }
  return colors;
}

function hexToRgb(hex) {
  // remove leading #
  hex = hex.slice(1);
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function rgbToHex(r, g, b) {
  const bigint = (r << 16) + (g << 8) + b;
  // format as html color
  return `#${bigint.toString(16).padStart(6, '0')}`;
}

const currentView = {
  // initial view set so image is centered & fully visible
  x0: -2.75,
  y0: -canvas.height * (4.0 / canvas.width) / 2,
  pixelDelta: 4.0 / canvas.width,
};

function updateCanvasSize() {
  canvas.width = window.innerWidth * WIDTH_PCT;
  canvas.height = window.innerHeight * HEIGHT_PCT;
}

// indicates whether window resize is in progress
let resizing = false;

function resizeWindow() {
  if (resizing) {
    return;
  }
  resizing = true;
  updateCanvasSize();
  awaitWorkersReady().then(() => { renderFull(); resizing = false; });
}

async function init() {
  initWorkers();
  await awaitWorkersReady();
  updateColorUI();
  initControls();
  initEvents();
  renderFull();
}

function initWorkers() {
  for (let i = 0; i < n_workers; i++) {
    const worker = new WorkerWrapper(i);
    workerWrappers.push(worker);
  }
}

async function awaitWorkersReady() {
  while (!allWorkersReady()) {
      await new Promise(resolve => setTimeout(resolve, RETRY_TIME));
  }
}

function allWorkersReady() {
  for (let worker of workerWrappers) {
    if (!worker.ready) {
      return false;
    }
  }
  return true;
}

async function findReadyWorker() {
  while (true) {
    // check every 0.1 seconds if a worker is ready
    await new Promise(resolve => setTimeout(resolve, RETRY_TIME));
    for (let worker of workerWrappers) {
      if (worker.ready) {
        return worker.id;
      }
    }
  }
}

function initControls() {
  // panning controled by wasd or arrow keys
  // zoom controlled by q/e or -/+
  document.addEventListener('keydown', e => {
    if (e.key === 'w' || e.key === 'ArrowUp') {
      moveUp();
    }
    else if (e.key === 'a' || e.key === 'ArrowLeft') {
      moveLeft();
    }
    else if (e.key === 's' || e.key === 'ArrowDown') {
      moveDown();
    }
    else if (e.key === 'd' || e.key === 'ArrowRight') {
      moveRight();
    }
    else if (e.key === 'e' || e.key === '+' || e.key === '=') {
      zoomIn();
    }
    else if (e.key === 'q' || e.key === '-') {
      zoomOut();
    }
  });
}

function initEvents() {
  // initialize all other events beside key presses
  window.addEventListener('resize', resizeWindow);
  // movement buttons
  document.getElementById('move-up').addEventListener('click', moveUp);
  document.getElementById('move-left').addEventListener('click', moveLeft);
  document.getElementById('move-down').addEventListener('click', moveDown);
  document.getElementById('move-right').addEventListener('click', moveRight);
  // zoom buttons
  document.getElementById('zoom-in').addEventListener('click', zoomIn);
  document.getElementById('zoom-out').addEventListener('click', zoomOut);
  // random colors button
  document.getElementById('random-colors').addEventListener('click', () => {
    currentColors = randomColors();
    updateColorUI();
    awaitWorkersReady().then(renderFull());
  });
  // color pickers
  for (let i = 0; i < 6; i++) {
    const picker = document.getElementById(`color-${i}`);
    picker.addEventListener('change', () => {
      currentColors[i] = hexToRgb(picker.value);
      awaitWorkersReady().then(renderFull());
    });
  }
}

function handleRenderResult(data) {
  let imgData = ctx.createImageData(data.origin.w, data.origin.h);
  imgData.data.set(data.result);
  // figure out offsets
  // (needed if image has been moved since request was made)
  const pixel_x0 = Math.round((data.origin.x0 - currentView.x0) / currentView.pixelDelta);
  const pixel_y0 = Math.round((data.origin.y0 - currentView.y0) / currentView.pixelDelta);
  ctx.putImageData(imgData, pixel_x0, pixel_y0);
}

async function renderBlock(w, h, x0, y0, pixelDelta) {
  const x1 = x0 + (w - 1) * pixelDelta;
  const y1 = y0 + (h - 1) * pixelDelta;
  const worker_id = await findReadyWorker();
  const worker = workerWrappers[worker_id];
  worker.sendMessage({
    w: w, h: h, 
    x0: x0, y0: y0,
    x1: x1, y1: y1,
    colors: currentColors,
  });
}

function renderFull() {
  const w = canvas.width;
  const h = Math.floor(canvas.height / n_workers);
  const x0 = currentView.x0;
  let y0 = currentView.y0;  // will be updated between blocks
  const pixelDelta = currentView.pixelDelta;
  for (let i = 0; i < n_workers - 1; i++) {
    renderBlock(w, h, x0, y0, pixelDelta, pixelDelta);
    y0 += h * pixelDelta;
  }
  // last block is the remainder of the canvas height
  const last_h = canvas.height - (n_workers - 1) * h;
  renderBlock(w, last_h, x0, y0, pixelDelta);
}

function updateZoom(factor) {
  // don't allow zooming unless all workers are ready
  if (!allWorkersReady()) {
    return;
  }
  newPixelDelta = currentView.pixelDelta * factor;
  currentView.x0 += (currentView.pixelDelta - newPixelDelta) * canvas.width / 2;
  currentView.y0 += (currentView.pixelDelta - newPixelDelta) * canvas.height / 2;
  currentView.pixelDelta = newPixelDelta;
  renderFull();
}

function zoomIn() {
  updateZoom(1 / ZOOM_FACTOR);
}

function zoomOut() {
  updateZoom(ZOOM_FACTOR);
}

function moveRight() {
  const pixelShift = MOVE_FACTOR * canvas.width;
  ctx.translate(-pixelShift, 0);
  ctx.drawImage(canvas, 0, 0);
  // reset transformation
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  currentView.x0 += pixelShift * currentView.pixelDelta;
  // draw newly exposed block
  renderBlock(
    pixelShift + 1, canvas.height,
    currentView.x0 + (canvas.width - pixelShift - 1) * currentView.pixelDelta,
    currentView.y0,
    currentView.pixelDelta
  );
}

function moveLeft() {
  const pixelShift = MOVE_FACTOR * canvas.width;
  // shift existing image to the right
  ctx.translate(pixelShift, 0);
  ctx.drawImage(canvas, 0, 0);
  // reset transformation
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  currentView.x0 -= pixelShift * currentView.pixelDelta;
  // draw newly exposed block
  renderBlock(
    pixelShift + 1, canvas.height,
    currentView.x0,
    currentView.y0,
    currentView.pixelDelta
  );
}

function moveUp() {
  const pixelShift = MOVE_FACTOR * canvas.height;
  ctx.translate(0, pixelShift);
  ctx.drawImage(canvas, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  currentView.y0 -= pixelShift * currentView.pixelDelta;
  renderBlock(
    canvas.width, pixelShift + 1,
    currentView.x0,
    currentView.y0,
    currentView.pixelDelta
  );
}

function moveDown() {
  const pixelShift = MOVE_FACTOR * canvas.height;
  ctx.translate(0, -pixelShift);
  ctx.drawImage(canvas, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  currentView.y0 += pixelShift * currentView.pixelDelta;
  renderBlock(
    canvas.width, pixelShift + 1,
    currentView.x0,
    currentView.y0 + (canvas.height - pixelShift - 1) * currentView.pixelDelta,
    currentView.pixelDelta
  );
}

init();