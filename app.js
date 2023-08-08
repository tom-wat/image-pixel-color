const fileButton = document.getElementById("file-button");
const fileInput = document.getElementById("file-input");
const canvas = document.getElementById("canvas");
const container = document.querySelector(".container");
const fullScale = document.getElementById("full-scale");
const fontInput = document.getElementById("font-size-input");
const colorInput = document.getElementById("font-color-input");
const alphaInput = document.getElementById("font-color-alpha-input");
const downloadBtn = document.getElementById("download-btn");
const drawingPositionX = document.getElementById("data-drawing-position-x");
const drawingPositionY = document.getElementById("data-drawing-position-y");
const offsetX = document.getElementById("offset-x");
const offsetY = document.getElementById("offset-y");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const positionXRadioNodeList = drawingPositionX.positionX;
const positionYRadioNodeList = drawingPositionY.positionY;

let image;
let undoStates = [];
let redoStates = [];
let currentStates;

fileButton.addEventListener("click", function () {
  fileInput.click();
});

const openFile = (event) => {
  console.log(event.target.files);
  const file = event.target.files[0];
  if (!file) {
    console.error("No file selected.");
    return;
  }
  const reader = new FileReader();
  reader.onload = function () {
    canvas.style.display = "block";
    image = new Image();
    image.src = reader.result;
    image.onload = function () {
      console.log(fullScale.checked);
      if (fullScale.checked) {
        actualDrawImage();
      } else {
        adjustedDrawImage();
      }
      changeFontSize(ctx, fontInput);
      changeColor(ctx, colorInput, alphaInput);
      undoStates = [];
      getCurrentImageState();
    };
  };

  reader.readAsDataURL(file);
  // 配列のファイルを削除する (インデックス0以降のすべての要素を削除)
};

fileInput.addEventListener("change", openFile);

function actualDrawImage() {
  if (!image) return;
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
}

//ウインドウの幅にキャンバスを合わせる
function adjustedDrawImage() {
  if (!image) return;
  const canvasWidth = Math.min(
    parseInt(window.getComputedStyle(container).width),
    image.width
  );
  canvas.width = canvasWidth;
  canvas.height = image.height * (canvasWidth / image.width);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

function updateOutput(element, value) {
  element.nextElementSibling.value = value.padStart(3, "0");
}

function rgbToHsl(r, g, b) {
  r = r / 255;
  g = g / 255;
  b = b / 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  console.log(h, s, l);
  return { h, s, l };
}

function rgbToLab(R, G, B) {
  // Convert RGB to XYZ
  const rLinear = R / 255;
  const gLinear = G / 255;
  const bLinear = B / 255;

  const rSrgb =
    rLinear > 0.04045 ? ((rLinear + 0.055) / 1.055) ** 2.4 : rLinear / 12.92;
  const gSrgb =
    gLinear > 0.04045 ? ((gLinear + 0.055) / 1.055) ** 2.4 : gLinear / 12.92;
  const bSrgb =
    bLinear > 0.04045 ? ((bLinear + 0.055) / 1.055) ** 2.4 : bLinear / 12.92;

  const x = rSrgb * 0.4124 + gSrgb * 0.3576 + bSrgb * 0.1805;
  const y = rSrgb * 0.2126 + gSrgb * 0.7152 + bSrgb * 0.0722;
  const z = rSrgb * 0.0193 + gSrgb * 0.1192 + bSrgb * 0.9505;

  // Convert XYZ to Lab
  const xRef = 0.95047;
  const yRef = 1.0;
  const zRef = 1.08883;

  const xRatio = x / xRef;
  const yRatio = y / yRef;
  const zRatio = z / zRef;

  const epsilon = 0.008856;
  const kappa = 903.3;

  const fx = xRatio > epsilon ? xRatio ** (1 / 3) : (kappa * xRatio + 16) / 116;
  const fy = yRatio > epsilon ? yRatio ** (1 / 3) : (kappa * yRatio + 16) / 116;
  const fz = zRatio > epsilon ? zRatio ** (1 / 3) : (kappa * zRatio + 16) / 116;

  const L = Math.round(116 * fy - 16);
  const a = Math.round(500 * (fx - fy));
  const b = Math.round(200 * (fy - fz));

  console.log(L, a, b);
  return { L, a, b };
}

canvas.addEventListener("click", function (e) {
  const x = e.offsetX;
  const y = e.offsetY;
  const color = ctx.getImageData(x, y, 1, 1).data;
  const { h, s, l } = rgbToHsl(color[0], color[1], color[2]);
  const { L, a, b } = rgbToLab(color[0], color[1], color[2]);
  const colorInfoElement = document.getElementById("colorInfo");
  colorInfoElement.style.setProperty(
    "--background-color",
    `rgb(${color[0]}, ${color[1]}, ${color[2]})`
  );
  colorInfoElement.textContent = `L:${L},h:${h},s:${s},l:${l}`;
});

function clearCanvas() {
  if (!undoStates.length) return;
  const intialState = undoStates[undoStates.length - 1];
  undoStates = [];
  undoStates.unshift(intialState);
  redoStates = [];
  ctx.putImageData(intialState, 0, 0);
  console.log(undoStates);
  console.log(redoStates);
}
function download() {
  // Canvasのイメージデータを取得する
  const imageData = canvas.toDataURL("image/png");

  // ダウンロード用のリンクを作成する
  const downloadLink = document.createElement("a");
  downloadLink.href = imageData;
  downloadLink.download = "image.png";

  // リンクをクリックすることでダウンロードを実行する
  downloadLink.click();
}
const debouncedDownload = debounce(download, 2000, true);

downloadBtn.addEventListener("click", debouncedDownload);

function debounce(func, delay, immediate) {
  let timerId;
  return function () {
    const context = this;
    const args = arguments;
    const callNow = immediate && !timerId;
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      if (!immediate) {
        func.apply(context, args);
      }
    }, delay);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

function changeFontSize(context, fontInput) {
  const fontSize = parseInt(fontInput.value);

  context.font = `500 ${fontSize}px Inter`;
}

fontInput.addEventListener("input", function () {
  changeFontSize(ctx, fontInput);
});

function drawMultilineText(
  context,
  text,
  pointX,
  pointY,
  lineHeight,
  textPositionX,
  textPositionY,
  fontSize,
  offsetX,
  offsetY
) {
  const lines = text.split(",");
  console.log(textPositionX, textPositionY);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWidth = context.measureText(line).width;
    const offsetXValue = [1, 5, 9];
    const offsetYValue = [1, 6, 10, 15, 19];
    let xOffset = 0;
    let yOffset = 0;
    let xOffsetAdjustment =
      (fontSize / 4 + fontSize / 2) * offsetXValue[offsetX];
    let yOffsetAdjustment = (fontSize / 2) * offsetYValue[offsetY];

    if (textPositionX === "left") {
      xOffset = -lineWidth - xOffsetAdjustment;
    } else {
      xOffset = xOffsetAdjustment;
    }

    if (textPositionY === "top") {
      yOffset = -lineHeight * (lines.length - 1) - yOffsetAdjustment;
    } else {
      yOffset = yOffsetAdjustment;
    }

    context.fillText(line, pointX + xOffset, pointY + yOffset);
    pointY += lineHeight;
  }
}

// クリックしたら色データをキャンバスに描画
canvas.addEventListener("click", function (event) {
  const pointX = event.offsetX;
  const pointY = event.offsetY;
  const colorInfoElement = document.getElementById("colorInfo");
  const text = `${colorInfoElement.textContent}`;
  const fontSize = parseInt(fontInput.value);
  const offsetXValue = parseInt(offsetX.value);
  const offsetYValue = parseInt(offsetY.value);
  const lineHeight = fontSize + fontSize / 8;
  const textPositionX = positionXRadioNodeList.value;
  const textPositionY = positionYRadioNodeList.value;

  // クリックした場所のピクセルカラー情報を取得する
  // const color = ctx.getImageData(x, y, 1, 1).data;

  // 新しい描画を行う
  drawMultilineText(
    ctx,
    text,
    pointX,
    pointY,
    lineHeight,
    textPositionX,
    textPositionY,
    fontSize,
    offsetXValue,
    offsetYValue
  );

  ctx.strokeStyle = ctx.fillStyle;
  ctx.strokeRect(
    pointX - fontSize / 2,
    pointY - fontSize / 2,
    fontSize - 2,
    fontSize - 2
  );
  // update current state
  redoStates = [];
  getCurrentImageState();
  console.log(undoStates);
  // ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  // ctx.fillRect(x - 2, y - 2, 5, 5);
});

const changeColor = (context, colorInput, alphaInput) => {
  const colorValue = colorInput.value;
  const hue = 0; // 色相 (0-360)
  const saturation = 0; // 彩度 (0-100)
  const lightness = colorValue; // 明度 (0-100)
  const alphaValue = alphaInput.value;
  console.log(colorInput.value);
  console.log(alphaInput.value);
  context.fillStyle =
    // "hsl(" + hue + ", " + saturation + "%, " + lightness + "%)";
    `hsl( ${hue}, ${saturation}%, ${lightness}%, ${alphaValue}%)`;
};

colorInput.addEventListener("input", function () {
  changeColor(ctx, colorInput, alphaInput);
});

alphaInput.addEventListener("input", function () {
  changeColor(ctx, colorInput, alphaInput);
});

function getCurrentImageState() {
  currentStates = ctx.getImageData(0, 0, image.width, image.height);
  undoStates.unshift(currentStates);
}
// function to undo
function undo() {
  if (undoStates.length <= 1) return;
  let firstUndoStates = undoStates.shift();
  redoStates.unshift(firstUndoStates);
  // redraw canvas
  ctx.putImageData(undoStates[0], 0, 0);
  console.log(undoStates);
  console.log(redoStates);
}

// function to redo
function redo() {
  // check if there's a next state in the array
  if (redoStates.length <= 0) return;
  let firstRedoStates = redoStates.shift();
  undoStates.unshift(firstRedoStates);
  // redraw canvas
  ctx.putImageData(undoStates[0], 0, 0);
  console.log(undoStates);
  console.log(redoStates);
}

// keyboard shortcuts

// Add event listeners to track the state of each key
document.addEventListener("keydown", (event) => {
  if (event.key === "f") {
    fileInput.click();
  }
  if (event.key === "w") {
    colorInput.value = (parseInt(colorInput.value) + 10).toString();
    colorInput.nextElementSibling.value = colorInput.value.padStart(3, "0");
    changeColor(ctx, colorInput, alphaInput);
  }
  if (event.key === "q") {
    colorInput.value = (parseInt(colorInput.value) - 10).toString();
    colorInput.nextElementSibling.value = colorInput.value.padStart(3, "0");
    changeColor(ctx, colorInput, alphaInput);
  }
  if (event.key === "o") {
    alphaInput.value = (parseInt(alphaInput.value) + 10).toString();
    alphaInput.nextElementSibling.value = alphaInput.value.padStart(3, "0");
    changeColor(ctx, colorInput, alphaInput);
  }
  if (event.key === "i") {
    alphaInput.value = (parseInt(alphaInput.value) - 10).toString();
    alphaInput.nextElementSibling.value = alphaInput.value.padStart(3, "0");
    changeColor(ctx, colorInput, alphaInput);
  }
  if (event.key === "s") {
    fontInput.value = (parseInt(fontInput.value) + 1).toString();
    fontInput.nextElementSibling.value = fontInput.value;
    changeFontSize(ctx, fontInput);
  }
  if (event.key === "a") {
    fontInput.value = (parseInt(fontInput.value) - 1).toString();
    fontInput.nextElementSibling.value = fontInput.value;
    changeFontSize(ctx, fontInput);
  }
  if (event.key === "h") {
    offsetX.value = (parseInt(offsetX.value) + 1).toString();
    offsetX.nextElementSibling.value = offsetX.value;
  }
  if (event.key === "g") {
    offsetX.value = (parseInt(offsetX.value) - 1).toString();
    offsetX.nextElementSibling.value = offsetX.value;
  }
  if (event.key === "y") {
    offsetY.value = (parseInt(offsetY.value) + 1).toString();
    offsetY.nextElementSibling.value = offsetY.value;
  }
  if (event.key === "t") {
    offsetY.value = (parseInt(offsetY.value) - 1).toString();
    offsetY.nextElementSibling.value = offsetY.value;
  }

  if (event.key === "x") {
    for (let i = 0; i < positionXRadioNodeList.length; i++) {
      if (positionXRadioNodeList[i].checked) {
        // console.log(positionXRadioNodeList[i]);
        // console.log(positionXRadioNodeList.length);
        // console.log(i);
        positionXRadioNodeList[i].checked = false;
        if (i + 1 === positionXRadioNodeList.length) {
          positionXRadioNodeList[0].checked = true;
          break;
        } else {
          positionXRadioNodeList[i + 1].checked = true;
          break;
        }
      }
    }
  }
  if (event.key === "z") {
    for (let i = 0; i < positionYRadioNodeList.length; i++) {
      if (positionYRadioNodeList[i].checked) {
        positionYRadioNodeList[i].checked = false;
        if (i + 1 === positionYRadioNodeList.length) {
          positionYRadioNodeList[0].checked = true;
          break;
        } else {
          positionYRadioNodeList[i + 1].checked = true;
          break;
        }
      }
    }
  }
  if (event.key === "p") {
    debouncedDownload();
  }
  if (event.key === "v") {
    fullScale.checked = !fullScale.checked;
  }
  if (event.key === "c") {
    clearCanvas();
  }
});

// Set up an object to track the current state of each key
let keyShift = false;
// let keyArrowUp = false;
// let keyArrowLeft = false;
// let keyArrowDown = false;
// let keyArrowRight = false;
let keyMeta = false;
let keyZ = false;
// let keyD = false;

// Define your key press handler
function handleKeyPress() {
  // if (keyShift) {
  //   if (keyArrowUp) {
  //     fontInput.value = (parseInt(fontInput.value) + 1).toString();
  //     fontInput.nextElementSibling.value = fontInput.value;
  //     changeFontSize(ctx, fontInput);
  //     keyArrowUp = false;
  //   }
  //   if (keyArrowLeft) {
  //     colorInput.value = (parseInt(colorInput.value) - 10).toString();
  //     colorInput.nextElementSibling.value = colorInput.value;
  //     changeColor(ctx, colorInput, alphaInput);
  //     keyArrowLeft = false;
  //   }
  //   if (keyArrowDown) {
  //     fontInput.value = (parseInt(fontInput.value) - 1).toString();
  //     fontInput.nextElementSibling.value = fontInput.value;
  //     changeFontSize(ctx, fontInput);
  //     keyArrowDown = false;
  //   }
  //   if (keyArrowRight) {
  //     colorInput.value = (parseInt(colorInput.value) + 10).toString();
  //     colorInput.nextElementSibling.value = colorInput.value;
  //     changeColor(ctx, colorInput, alphaInput);
  //     keyArrowRight = false;
  //   }
  // }
  if (keyMeta && keyZ && !keyShift) {
    undo();
    keyZ = false;
  }
  if (keyMeta && keyShift && keyZ) {
    redo();
    keyZ = false;
  }
}

// Add event listeners to track the state of each key
document.addEventListener("keydown", (event) => {
  if (event.key === "Shift") {
    keyShift = true;
  }
  // if (event.key === "ArrowUp") {
  //   keyArrowUp = true;
  // }
  // if (event.key === "ArrowLeft") {
  //   keyArrowLeft = true;
  // }
  // if (event.key === "ArrowDown") {
  //   keyArrowDown = true;
  // }
  // if (event.key === "ArrowRight") {
  //   keyArrowRight = true;
  // }
  if (event.key === "Meta") {
    keyMeta = true;
  }
  if (event.key === "z") {
    keyZ = true;
  }
  // if (event.key === "d") {
  //   keyD = true;
  // }
  // console.log(event.key);
  // console.log(`keyShift:${keyShift}`);
  // console.log(`keyMeta:${keyMeta}`);
  // console.log(`keyZ:${keyZ}`);
  handleKeyPress();
});

document.addEventListener("keyup", (event) => {
  if (event.key === "Shift") {
    keyShift = false;
  }
  // if (event.key === "ArrowUp") {
  //   keyArrowUp = false;
  // }
  // if (event.key === "ArrowLeft") {
  //   keyArrowLeft = false;
  // }
  // if (event.key === "ArrowDown") {
  //   keyArrowDown = false;
  // }
  // if (event.key === "ArrowRight") {
  //   keyArrowRight = false;
  // }
  if (event.key === "Meta") {
    keyMeta = false;
  }
  if (event.key === "z") {
    keyZ = false;
  }
  // if (event.key === "d") {
  //   keyD = false;
  // }
});
