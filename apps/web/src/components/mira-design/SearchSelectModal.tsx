import { useEffect, useMemo, useState, type ReactNode } from "react";
import SearchSelectModalChrome from "./SearchSelectModalChrome";

export type SearchSelectModalItem = {
  id: string;
  label: string;
  description?: string | null;
  keywords?: string[];
  meta?: string;
  title?: string;
  disabled?: boolean;
};

export interface SearchSelectModalProps {
  open: boolean;
  title: ReactNode;
  loadItems: (signal: AbortSignal) => Promise<SearchSelectModalItem[]>;
  selectedId?: string | null;
  width?: number | string;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  loadErrorText?: string;
  onCheck: (item: SearchSelectModalItem) => boolean | Promise<boolean>;
  onClose: () => void;
}

const matchesSearch = (item: SearchSelectModalItem, query: string) =>
  [item.label, item.description ?? "", item.meta ?? "", item.title ?? "", ...(item.keywords ?? [])]
    .join("\n")
    .toLowerCase()
    .includes(query);

export default function SearchSelectModal({
  open,
  title,
  loadItems,
  selectedId,
  width = 520,
  searchPlaceholder = "搜索",
  emptyText = "没有找到项目",
  loadingText = "加载中…",
  loadErrorText = "加载失败",
  onCheck,
  onClose,
}: SearchSelectModalProps) {
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<SearchSelectModalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSearchText("");
      setErrorText(null);
      setSubmittingId(null);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        setErrorText(null);
        const nextItems = await loadItems(controller.signal);
        if (!controller.signal.aborted) {
          setItems(nextItems);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setItems([]);
          setErrorText(
            error instanceof Error && error.message.trim() ? error.message : loadErrorText,
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [loadErrorText, loadItems, open]);

  const visibleItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return query ? items.filter((item) => matchesSearch(item, query)) : items;
  }, [items, searchText]);

  const handleCheck = async (item: SearchSelectModalItem) => {
    if (item.disabled || submittingId) return;
    try {
      setSubmittingId(item.id);
      if (await onCheck(item)) onClose();
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <SearchSelectModalChrome
      open={open}
      title={title}
      width={width}
      height="min(70vh, 36rem)"
      searchText={searchText}
      searchPlaceholder={searchPlaceholder}
      loading={loading}
      loadingText={loadingText}
      errorText={errorText}
      emptyText={emptyText}
      {...(selectedId !== undefined ? { selectedId } : {})}
      submittingId={submittingId}
      items={visibleItems}
      onSearchTextChange={setSearchText}
      onItemClick={(item) => void handleCheck(item)}
      onClose={onClose}
    />
  );
}
