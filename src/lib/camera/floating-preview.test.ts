import { expect, it } from "vitest";
import { clampPreviewPosition } from "./floating-preview";
it("keeps a dragged preview inside the viewport after rotation", () => {
  expect(clampPreviewPosition({x:500,y:600},{width:412,height:393},{width:340,height:700})).toEqual({x:56,y:16});
  expect(clampPreviewPosition({x:-20,y:-20},{width:412,height:900},{width:340,height:500})).toEqual({x:16,y:16});
  expect(clampPreviewPosition({x:20,y:80},{width:1440,height:900},{width:340,height:500})).toEqual({x:20,y:80});
});
