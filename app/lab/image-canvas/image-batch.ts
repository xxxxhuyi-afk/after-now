export type ImageCount = 1 | 2 | 3 | 4;

/** Each request consumes its own existing quota. Never retry a failed request automatically. */
export async function runImageBatch<T>(options: {
  count: ImageCount;
  shouldStop: () => boolean;
  onProgress: (index: number) => void;
  generate: () => Promise<T>;
  onResult: (result: T, index: number) => void;
}) {
  if (![1, 2, 3, 4].includes(options.count)) throw new Error("请选择 1–4 张图片。");
  let completed = 0;
  for (let index = 0; index < options.count; index += 1) {
    if (options.shouldStop()) return { completed, stopped: true, error: null };
    options.onProgress(index);
    try {
      const result = await options.generate();
      options.onResult(result, index);
      completed += 1;
    } catch (error) {
      return { completed, stopped: false, error: error instanceof Error ? error.message : "生成失败，请重试。" };
    }
  }
  return { completed, stopped: false, error: null };
}
