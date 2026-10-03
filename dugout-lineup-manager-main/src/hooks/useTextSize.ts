import { useLayoutEffect, useState } from "react";
import { applyTextSize, readTextSize, TextSize, writeTextSize } from "@/lib/appearance";

export function useTextSize() {
  const [textSize, setTextSizeState] = useState<TextSize>(() => readTextSize());

  useLayoutEffect(() => {
    applyTextSize(textSize);
    writeTextSize(textSize);
  }, [textSize]);

  return { textSize, setTextSize: setTextSizeState };
}
