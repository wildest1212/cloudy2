const canvas = document.querySelector("#avatarCanvas");
const context = canvas.getContext("2d");
const avatarText = document.querySelector("#avatarText");
const downloadButton = document.querySelector("#downloadButton");

const textFillColor = "#e8d431";
const textStrokeColor = "#123772";
const backgroundImagePath = "./background.png";
const maxTextWidthRatio = 0.82;
const minFontSize = 18;
const englishFontFamily = '"Eagle Bold", Impact, "Arial Black", sans-serif';
const chineseFontFamily = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const backgroundImage = new Image();

backgroundImage.addEventListener("load", drawAvatar);
backgroundImage.addEventListener("error", drawAvatar);
backgroundImage.src = backgroundImagePath;

function getDisplayText(value) {
  return value.trim() || "TS";
}

function getFontFamily(text) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(text) ? chineseFontFamily : englishFontFamily;
}

function getBaseFontSize(text) {
  const length = Array.from(text).length;

  if (length <= 1) return 224;
  if (length === 2) return 188;
  if (length === 3) return 148;
  if (length === 4) return 118;
  if (length <= 6) return 92;
  if (length <= 10) return 68;
  if (length <= 16) return 54;
  return 42;
}

function getCharacterRotation(index) {
  return (index % 2 === 0 ? -4 : 4) * (Math.PI / 180);
}

function getCharacterSpacing(fontSize) {
  return Math.min(-2, -fontSize * 0.03);
}

function measureTextLayout(text, fontSize, fontFamily) {
  const characters = Array.from(text);
  const spacing = getCharacterSpacing(fontSize);

  context.save();
  context.font = `900 ${fontSize}px ${fontFamily}`;

  const widths = characters.map((character) => context.measureText(character).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * Math.max(0, characters.length - 1);

  context.restore();

  return { characters, widths, spacing, totalWidth };
}

function getFittedFontSize(text, fontFamily) {
  const maxWidth = canvas.width * maxTextWidthRatio;
  let fontSize = getBaseFontSize(text);

  while (fontSize > minFontSize && measureTextLayout(text, fontSize, fontFamily).totalWidth > maxWidth) {
    fontSize -= 2;
  }

  return fontSize;
}

function drawImageCover(image) {
  const imageRatio = image.width / image.height;
  const canvasRatio = canvas.width / canvas.height;

  if (imageRatio > canvasRatio) {
    const sourceWidth = image.height * canvasRatio;
    const sourceX = (image.width - sourceWidth) / 2;
    context.drawImage(image, sourceX, 0, sourceWidth, image.height, 0, 0, canvas.width, canvas.height);
    return;
  }

  const sourceHeight = image.width / canvasRatio;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, 0, sourceY, image.width, sourceHeight, 0, 0, canvas.width, canvas.height);
}

function drawMissingBackgroundFallback() {
  context.fillStyle = "#d7e7f7";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBackground() {
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    drawImageCover(backgroundImage);
    return;
  }

  drawMissingBackgroundFallback();
}

function drawPlayfulText(text, fontSize, fontFamily) {
  const { characters, widths, spacing, totalWidth } = measureTextLayout(text, fontSize, fontFamily);
  let cursorX = (canvas.width - totalWidth) / 2;
  const centerY = canvas.height / 2 + 6;

  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.font = `900 ${fontSize}px ${fontFamily}`;
  context.strokeStyle = textStrokeColor;
  context.lineWidth = Math.max(8, Math.round(fontSize * 0.11));
  context.fillStyle = textFillColor;
  context.shadowColor = "rgba(18, 55, 114, 0.18)";
  context.shadowBlur = 6;
  context.shadowOffsetY = 3;

  characters.forEach((character, index) => {
    const characterCenterX = cursorX + widths[index] / 2;

    context.save();
    context.translate(characterCenterX, centerY);
    context.rotate(getCharacterRotation(index));
    context.strokeText(character, 0, 0);
    context.fillText(character, 0, 0);
    context.restore();

    cursorX += widths[index] + spacing;
  });

  context.restore();
}

function drawAvatar() {
  const text = getDisplayText(avatarText.value);
  const fontFamily = getFontFamily(text);
  const fontSize = getFittedFontSize(text, fontFamily);

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlayfulText(text, fontSize, fontFamily);
}

function downloadAvatar() {
  const link = document.createElement("a");
  const safeName = (avatarText.value.trim() || "TS").replace(/[\\/:*?"<>|\s]+/g, "-");

  link.download = `${safeName}-avatar.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

avatarText.addEventListener("input", drawAvatar);
downloadButton.addEventListener("click", downloadAvatar);
document.fonts.ready.then(drawAvatar);

drawAvatar();
