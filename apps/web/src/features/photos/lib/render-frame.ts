export interface FrameConfig {
  template: "banner_top" | "banner_bottom" | "corner" | "border";
  message: string;
  color: string;
}

export async function renderFrameOnPhoto(
  imageBlob: Blob,
  frame: FrameConfig | null
): Promise<Blob> {
  // If no frame, return original blob
  if (!frame) return imageBlob;

  // Create image from blob
  const img = await createImageBitmap(imageBlob);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Calculate font size relative to image
  const fontSize = Math.max(16, Math.round(canvas.width / 25));
  const bannerHeight = fontSize * 2.5;

  // Draw frame overlay based on template
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = frame.color;

  switch (frame.template) {
    case "banner_top":
      ctx.fillRect(0, 0, canvas.width, bannerHeight);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(frame.message, canvas.width / 2, bannerHeight / 2);
      break;

    case "banner_bottom":
      ctx.fillRect(
        0,
        canvas.height - bannerHeight,
        canvas.width,
        bannerHeight
      );
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        frame.message,
        canvas.width / 2,
        canvas.height - bannerHeight / 2
      );
      break;

    case "corner": {
      // Top-right corner badge
      const badgeWidth = Math.max(120, frame.message.length * fontSize * 0.7);
      const badgeHeight = fontSize * 2;
      const padding = 10;
      ctx.beginPath();
      ctx.roundRect(
        canvas.width - badgeWidth - padding,
        padding,
        badgeWidth,
        badgeHeight,
        8
      );
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${fontSize * 0.8}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        frame.message,
        canvas.width - badgeWidth / 2 - padding,
        padding + badgeHeight / 2
      );
      break;
    }

    case "border": {
      const borderWidth = Math.max(6, Math.round(canvas.width / 80));
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = frame.color;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(
        borderWidth / 2,
        borderWidth / 2,
        canvas.width - borderWidth,
        canvas.height - borderWidth
      );
      // Message at bottom center inside border
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = frame.color;
      const labelHeight = fontSize * 2;
      ctx.fillRect(
        0,
        canvas.height - labelHeight - borderWidth,
        canvas.width,
        labelHeight
      );
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        frame.message,
        canvas.width / 2,
        canvas.height - labelHeight / 2 - borderWidth
      );
      break;
    }
  }

  // Convert canvas to blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to convert canvas to blob"));
      },
      "image/jpeg",
      0.92
    );
  });
}
