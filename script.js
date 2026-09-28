const pdfjsLib = await import(
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
);

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");
const pageInfo = document.getElementById("pageInfo");
const zoomInfo = document.getElementById("zoomInfo");
const errorBox = document.getElementById("pdfError");

let pdfDoc = null;
let pageNum = 1;
let scale = 1.0;
let rendering = false;
let pendingPage = null;

async function renderPage(num) {
  rendering = true;
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  pageInfo.textContent = `${pageNum} / ${pdfDoc.numPages}`;
  zoomInfo.textContent = `${Math.round(scale * 100)}%`;
  rendering = false;

  if (pendingPage !== null) {
    const next = pendingPage;
    pendingPage = null;
    renderPage(next);
  }
}

function queuePage(num) {
  if (!pdfDoc || num < 1 || num > pdfDoc.numPages) return;
  if (rendering) {
    pendingPage = num;
  } else {
    pageNum = num;
    renderPage(pageNum);
  }
}

document.getElementById("prevPage").addEventListener("click", () => queuePage(pageNum - 1));
document.getElementById("nextPage").addEventListener("click", () => queuePage(pageNum + 1));

document.getElementById("zoomIn").addEventListener("click", () => {
  scale = Math.min(2.5, scale + 0.1);
  renderPage(pageNum);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  scale = Math.max(0.5, scale - 0.1);
  renderPage(pageNum);
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
