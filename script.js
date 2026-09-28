const pdfjsLib = await import(
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
);

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

const pageInfo = document.getElementById("pageInfo");
const zoomInfo = document.getElementById("zoomInfo");
const errorBox = document.getElementById("pdfError");
const pdfStage = document.querySelector(".pdf-stage");

let pdfDoc = null;
let pageNum = 1;
let zoom = 1;
let rendering = false;
let pendingPage = null;

const DPR = Math.min(window.devicePixelRatio || 1, 2.5);

async function getFitScale(page) {
  const baseViewport = page.getViewport({ scale: 1 });
  const availableWidth = Math.max(280, pdfStage.clientWidth - 32);
  return availableWidth / baseViewport.width;
}

async function renderPage(num) {
  if (!pdfDoc) return;

  rendering = true;

  try {
    const page = await pdfDoc.getPage(num);

    const fitScale = await getFitScale(page);
    const cssScale = fitScale * zoom;
    const renderScale = cssScale * DPR;

    const viewport = page.getViewport({
      scale: renderScale
    });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    canvas.style.width = `${viewport.width / DPR}px`;
    canvas.style.height = `${viewport.height / DPR}px`;

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;

    pageInfo.textContent = `${pageNum} / ${pdfDoc.numPages}`;
    zoomInfo.textContent = `${Math.round(zoom * 100)}%`;

    document.getElementById("prevPage").disabled = pageNum <= 1;
    document.getElementById("nextPage").disabled = pageNum >= pdfDoc.numPages;

  } finally {
    rendering = false;
  }

  if (pendingPage !== null) {
    const next = pendingPage;
    pendingPage = null;
    pageNum = next;
    renderPage(pageNum);
  }
}

function queuePage(num) {
  if (!pdfDoc || num < 1 || num > pdfDoc.numPages) return;

  if (rendering) {
    pendingPage = num;
    return;
  }

  pageNum = num;
  renderPage(pageNum);
}

document.getElementById("prevPage").addEventListener("click", () => {
  queuePage(pageNum - 1);
});

document.getElementById("nextPage").addEventListener("click", () => {
  queuePage(pageNum + 1);
});

document.getElementById("zoomIn").addEventListener("click", () => {
  zoom = Math.min(2.5, +(zoom + 0.1).toFixed(2));
  renderPage(pageNum);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  zoom = Math.max(0.6, +(zoom - 0.1).toFixed(2));
  renderPage(pageNum);
});

let resizeTimer;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    if (pdfDoc && !rendering) {
      renderPage(pageNum);
    }
  }, 200);
});

try {
  pdfDoc = await pdfjsLib.getDocument("assets/resume.pdf").promise;

  pageInfo.textContent = `1 / ${pdfDoc.numPages}`;

  await renderPage(1);

} catch (error) {
  console.error(error);
  errorBox.hidden = false;
  canvas.hidden = true;
}
