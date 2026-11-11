export const loadMarkdownText = async () => {
  const [, module] = await Promise.all([
    import("katex/dist/katex.min.css"),
    import("./MarkdownText.tsx"),
  ]);
  return module;
};

export const loadMarkdownEditor = () => import("./MarkdownEditor.tsx");
