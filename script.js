const canvas = document.querySelector("#avatarCanvas");
const context = canvas.getContext("2d");
const avatarText = document.querySelector("#avatarText");
const badgeText = document.querySelector("#badgeText");
const badgeToggle = document.querySelector("#badgeToggle");
const downloadButton = document.querySelector("#downloadButton");

const colors = {
  badgeBackground: "#d90428",
  textFill: "#e8d431",
  textStroke: "#123772",
};

const fonts = {
  badgeLatin: '"Gill Sans Ultra Bold", "Gill Sans", "Eagle Bold", Impact, "Arial Black", sans-serif',
  chinese: '"Source Han Sans SC Heavy", "Source Han Sans SC", "Microsoft YaHei", sans-serif',
  latin: '"Eagle Bold", Impact, "Arial Black", sans-serif',
};

const layoutConfig = {
  badgeMaxTextWidthRatio: 0.76,
  badgeTopOffsetRatio: 0.4,
  minFontSize: 18,
  noBadgeCenterYRatio: 0.5,
  topLogoCenterYRatio: 0.392,
  topMaxWidthRatio: 0.96,
};

const topLetterPattern = {
  rotations: [-7, -2, 5, 0, 3, 7, -4, 4],
  scales: [1.22, 0.94, 1.14, 1.02, 1.04, 1.2, 1.05, 0.98],
  yOffsets: [5, 14, 2, 11, 9, 0, 8, 4],
};

const backgroundImage = new Image();
backgroundImage.addEventListener("load", drawAvatar);
backgroundImage.addEventListener("error", drawAvatar);
backgroundImage.src = "./background.png";

function containsChinese(text) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(text);
}

function normalizeDisplayText(value, fallback) {
  const text = value.trim() || fallback;
  return containsChinese(text) ? text : text.toLocaleUpperCase("en-US");
}

function uppercaseLatinInput(input) {
  if (containsChinese(input.value)) return;

  const upperValue = input.value.toLocaleUpperCase("en-US");

  if (input.value !== upperValue) {
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    input.value = upperValue;
    input.setSelectionRange(selectionStart, selectionEnd);
  }
}

function getTopFontFamily(text) {
  return containsChinese(text) ? fonts.chinese : fonts.latin;
}

function getBadgeFontFamily(text) {
  return containsChinese(text) ? fonts.chinese : fonts.badgeLatin;
}

function getTopBaseFontSize(text) {
  const length = Array.from(text).length;

  if (length <= 1) return 220;
  if (length === 2) return 190;
  if (length === 3) return 162;
  if (length === 4) return 142;
  if (length <= 6) return 124;
  if (length <= 8) return 104;
  if (length <= 12) return 82;
  if (length <= 16) return 64;
  return 48;
}

function getBadgeBaseFontSize(text) {
  const length = Array.from(text).length;

  if (length <= 2) return 104;
  if (length <= 4) return 86;
  if (length <= 6) return 72;
  if (length <= 10) return 54;
  return 40;
}

function withCanvasFont(fontSize, fontFamily, callback) {
  context.save();
  context.font = `900 ${fontSize}px ${fontFamily}`;
  const result = callback();
  context.restore();

  return result;
}

function measureTextWidth(text, fontSize, fontFamily) {
  return withCanvasFont(fontSize, fontFamily, () => context.measureText(text).width);
}

function getPatternValue(values, index) {
  return values[index % values.length];
}

function getTopLogoCenterY() {
  return canvas.height * layoutConfig.topLogoCenterYRatio;
}

function getNoBadgeCenterY() {
  return canvas.height * layoutConfig.noBadgeCenterYRatio;
}

function getTopLogoLayout(text, fontSize, fontFamily, centerY = getTopLogoCenterY()) {
  const letters = Array.from(text).map((character, index) => {
    const size = fontSize * getPatternValue(topLetterPattern.scales, index);
    const width = measureTextWidth(character, size, fontFamily);

    return {
      character,
      rotation: getPatternValue(topLetterPattern.rotations, index) * (Math.PI / 180),
      size,
      width,
      yOffset: getPatternValue(topLetterPattern.yOffsets, index),
    };
  });

  const advances = letters.map((letter, index) => {
    const next = letters[index + 1];
    if (!next) return 0;

    const overlap = Math.min(letter.width, next.width) * 0.24;
    return letter.width * 0.5 + next.width * 0.5 - overlap;
  });

  const totalWidth = letters.reduce((sum, letter, index) => sum + (index === 0 ? letter.width : advances[index - 1]), 0);
  let cursorX = (canvas.width - totalWidth) / 2 + letters[0].width / 2;

  return letters.map((letter, index) => {
    const positionedLetter = {
      ...letter,
      x: cursorX,
      y: centerY + letter.yOffset,
    };

    cursorX += advances[index] || 0;
    return positionedLetter;
  });
}

function getTopLayoutBounds(layout) {
  const strokePadding = canvas.width * 0.025;
  const bounds = layout.map((letter) => {
    const halfWidth = letter.width * 0.62 + strokePadding;
    const halfHeight = letter.size * 0.58 + strokePadding;
    const sin = Math.abs(Math.sin(letter.rotation));
    const cos = Math.abs(Math.cos(letter.rotation));
    const rotatedHalfWidth = halfWidth * cos + halfHeight * sin;
    const rotatedHalfHeight = halfWidth * sin + halfHeight * cos;

    return {
      bottom: letter.y + rotatedHalfHeight,
      left: letter.x - rotatedHalfWidth,
      right: letter.x + rotatedHalfWidth,
      top: letter.y - rotatedHalfHeight,
    };
  });

  return {
    bottom: Math.max(...bounds.map((bound) => bound.bottom)),
    left: Math.min(...bounds.map((bound) => bound.left)),
    right: Math.max(...bounds.map((bound) => bound.right)),
    top: Math.min(...bounds.map((bound) => bound.top)),
  };
}

function fitTopFontSize(text, fontFamily, centerY = getTopLogoCenterY()) {
  let fontSize = getTopBaseFontSize(text);
  let layout = getTopLogoLayout(text, fontSize, fontFamily, centerY);
  let bounds = getTopLayoutBounds(layout);

  while (fontSize > layoutConfig.minFontSize && bounds.right - bounds.left > canvas.width * layoutConfig.topMaxWidthRatio) {
    fontSize -= 2;
    layout = getTopLogoLayout(text, fontSize, fontFamily, centerY);
    bounds = getTopLayoutBounds(layout);
  }

  return fontSize;
}

function fitBadgeFontSize(text, fontFamily) {
  const maxWidth = canvas.width * layoutConfig.badgeMaxTextWidthRatio;
  let fontSize = getBadgeBaseFontSize(text);

  while (fontSize > layoutConfig.minFontSize && measureTextWidth(text, fontSize, fontFamily) > maxWidth) {
    fontSize -= 2;
  }

  return fontSize;
}

function getBadgeLayout(text, fontSize, fontFamily, topFontSize) {
  const textWidth = measureTextWidth(text, fontSize, fontFamily);
  const horizontalPadding = Math.max(canvas.width * 0.075, fontSize * 0.78);
  const boardWidth = Math.min(canvas.width * 0.92, Math.max(canvas.width * 0.5, textWidth + horizontalPadding * 2));
  const boardHeight = Math.min(canvas.height * 0.25, Math.max(canvas.height * 0.17, fontSize * 1.62));
  const centerX = canvas.width * 0.51;
  const topY = getTopLogoCenterY() + topFontSize * layoutConfig.badgeTopOffsetRatio;
  const bottomY = topY + boardHeight;
  const centerY = topY + boardHeight * 0.54;
  const leftX = centerX - boardWidth / 2;
  const rightX = centerX + boardWidth / 2;

  return { boardHeight, boardWidth, bottomY, centerX, centerY, leftX, rightX, topY };
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

function drawBackground() {
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    drawImageCover(backgroundImage);
    return;
  }

  context.fillStyle = "#d7e7f7";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTopLogoText(layout, fontFamily) {
  layout.forEach((letter) => {
    context.save();
    context.translate(letter.x, letter.y);
    context.rotate(letter.rotation);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.miterLimit = 2;
    context.font = `900 ${letter.size}px ${fontFamily}`;
    context.strokeStyle = colors.textStroke;
    context.lineWidth = Math.max(11, Math.round(letter.size * 0.13));
    context.fillStyle = colors.textFill;
    context.shadowColor = "rgba(18, 55, 114, 0.22)";
    context.shadowBlur = 7;
    context.shadowOffsetX = 3;
    context.shadowOffsetY = 4;
    context.strokeText(letter.character, 0, 0);
    context.fillText(letter.character, 0, 0);
    context.restore();
  });
}

function drawBadgeBackground(layout) {
  const skew = layout.boardWidth * 0.035;
  const lift = layout.boardHeight * 0.08;

  context.save();
  context.fillStyle = colors.badgeBackground;
  context.shadowColor = "rgba(18, 55, 114, 0.14)";
  context.shadowBlur = 5;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 3;
  context.beginPath();
  context.moveTo(layout.leftX + skew, layout.topY + lift);
  context.lineTo(layout.rightX - skew * 1.25, layout.topY);
  context.lineTo(layout.rightX, layout.bottomY - lift * 0.65);
  context.lineTo(layout.leftX, layout.bottomY);
  context.closePath();
  context.fill();
  context.restore();
}

function drawBadgeText(text, fontSize, fontFamily, layout) {
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.font = `900 ${fontSize}px ${fontFamily}`;
  context.fillStyle = colors.textFill;
  context.shadowColor = "rgba(0, 0, 0, 0.12)";
  context.shadowBlur = 3;
  context.shadowOffsetY = 2;
  context.fillText(text, layout.centerX, layout.centerY + layout.boardHeight * 0.03);
  context.restore();
}

function drawBadge(text, topFontSize) {
  const fontFamily = getBadgeFontFamily(text);
  const fontSize = fitBadgeFontSize(text, fontFamily);
  const layout = getBadgeLayout(text, fontSize, fontFamily, topFontSize);

  drawBadgeBackground(layout);
  drawBadgeText(text, fontSize, fontFamily, layout);
}

function drawAvatar() {
  const topText = normalizeDisplayText(avatarText.value, "TAYLOR");
  const badgeTextValue = normalizeDisplayText(badgeText.value, "SWIFT");
  const topFontFamily = getTopFontFamily(topText);
  const hasBadge = badgeToggle.checked;
  const topCenterY = hasBadge ? getTopLogoCenterY() : getNoBadgeCenterY();
  const topFontSize = fitTopFontSize(topText, topFontFamily, topCenterY);
  const topLayout = getTopLogoLayout(topText, topFontSize, topFontFamily, topCenterY);

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  if (hasBadge) {
    drawBadge(badgeTextValue, topFontSize);
  }

  drawTopLogoText(topLayout, topFontFamily);
}

function downloadAvatar() {
  const topName = normalizeDisplayText(avatarText.value, "TAYLOR");
  const badgeName = normalizeDisplayText(badgeText.value, "SWIFT");
  const variant = badgeToggle.checked ? badgeName : "NO-BADGE";
  const safeName = `${topName}-${variant}`.replace(/[\\/:*?"<>|\s]+/g, "-");
  const link = document.createElement("a");

  link.download = `${safeName}-avatar.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function handleTextInput(event) {
  uppercaseLatinInput(event.currentTarget);
  drawAvatar();
}

uppercaseLatinInput(avatarText);
uppercaseLatinInput(badgeText);
avatarText.addEventListener("input", handleTextInput);
badgeText.addEventListener("input", handleTextInput);
badgeToggle.addEventListener("change", drawAvatar);
downloadButton.addEventListener("click", downloadAvatar);
document.fonts.ready.then(drawAvatar);

drawAvatar();
