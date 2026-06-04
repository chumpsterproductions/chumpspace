"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, closestCorners, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  Archive,
  Check,
  CheckSquare,
  ClipboardPaste,
  ImageUp,
  MessageSquare,
  Paperclip,
  Plus,
  Settings2,
  Tags,
  Users,
  X,
} from "lucide-react";
import {
  addAttachmentAction,
  addChecklistItemAction,
  addCommentAction,
  archiveCardAction,
  archiveListAction,
  createCardAction,
  createChecklistAction,
  createLabelAction,
  createListAction,
  deleteBoardAction,
  moveCardAction,
  moveListAction,
  toggleCardLabelAction,
  toggleCardMemberAction,
  toggleChecklistItemAction,
  updateBoardSettingsAction,
  updateCardAction,
  updateListTitleAction,
  uploadCardImageAction,
} from "@/app/actions/board";
import { MentionText } from "@/components/mention-text";
import { FileInput } from "@/components/ui/file-input";
import { MentionInput } from "@/components/ui/mention-input";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Attachment, BoardPageData, CardRecord, ListRecord } from "@/lib/types";
import { formatTimestamp, getProfileHandle, isImageUrl } from "@/lib/utils";

type CardContextMenu = {
  cardId: string;
  x: number;
  y: number;
};

function SortableListShell({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const sortable = useSortable({
    id,
    data: {
      type: "list",
    },
  });

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition ? `${sortable.transition}, box-shadow 160ms ease` : "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        zIndex: sortable.isDragging ? 60 : "auto",
        position: sortable.isDragging ? "relative" : "static",
        boxShadow: sortable.isDragging ? "0 35px 120px rgba(0,0,0,0.72)" : undefined,
      }}
      {...sortable.attributes}
      className="board-column-enter w-[360px] min-w-[360px] max-w-[360px]"
    >
      <div {...sortable.listeners}>{children}</div>
    </div>
  );
}

function SortableCardShell({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const sortable = useSortable({
    id,
    data: {
      type: "card",
    },
  });

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          sortable.transform == null
            ? null
            : {
              ...sortable.transform,
              rotate: Math.max(-10, Math.min(10, (sortable.transform.x ?? 0) * 0.05)),
            } as typeof sortable.transform,
        ),
        transition: sortable.transition ? `${sortable.transition}, box-shadow 120ms ease` : "transform 160ms cubic-bezier(0.22, 1, 0.36, 1)",
        zIndex: sortable.isDragging ? 80 : "auto",
        position: sortable.isDragging ? "relative" : "static",
        boxShadow: sortable.isDragging ? "0 28px 90px rgba(0,0,0,0.65)" : undefined,
      }}
      {...sortable.attributes}
      {...sortable.listeners}
      className="w-full min-w-0"
    >
      {children}
    </div>
  );
}

export function BoardClient({ data }: { data: BoardPageData }) {
  const router = useRouter();
  const dndContextId = useId();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [boardData, setBoardData] = useState(data);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [selectedLabelId, setSelectedLabelId] = useState<string>("all");
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);
  const [isUploadingPaste, setIsUploadingPaste] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [completedDraft, setCompletedDraft] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<CardContextMenu | null>(null);
  const cardFormRef = useRef<HTMLFormElement | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setBoardData(data);
  }, [data]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 8000);

    return () => {
      window.clearInterval(interval);
    };
  }, [router]);

  const selectedCard = useMemo(() => {
    for (const list of boardData.lists) {
      for (const card of list.cards) {
        if (card.id === selectedCardId) {
          return card;
        }
      }
    }

    return null;
  }, [boardData.lists, selectedCardId]);

  const draggedCard = useMemo(() => {
    if (draggedCardId == null) {
      return null;
    }

    for (const list of boardData.lists) {
      for (const card of list.cards) {
        if (card.id === draggedCardId) {
          return card;
        }
      }
    }

    return null;
  }, [boardData.lists, draggedCardId]);

  const draggedList = useMemo(() => {
    if (draggedListId == null) {
      return null;
    }

    return boardData.lists.find((list) => list.id === draggedListId) ?? null;
  }, [boardData.lists, draggedListId]);

  const contextMenuCard = useMemo(() => {
    if (contextMenu == null) {
      return null;
    }

    for (const list of boardData.lists) {
      for (const card of list.cards) {
        if (card.id === contextMenu.cardId) {
          return card;
        }
      }
    }

    return null;
  }, [boardData.lists, contextMenu]);

  const currentProfile = useMemo(() => {
    const fromMembers = boardData.members.find((member) => member.profile.id === boardData.currentUserId)?.profile;

    if (fromMembers != null) {
      return fromMembers;
    }

    return selectedCard?.comments[0]?.profile ?? null;
  }, [boardData.currentUserId, boardData.members, selectedCard]);

  useEffect(() => {
    if (selectedCardId != null && selectedCard == null) {
      setSelectedCardId(null);
    }
  }, [selectedCard, selectedCardId]);

  useEffect(() => {
    setDescriptionDraft(selectedCard?.description ?? "");
    setCommentDraft("");
    setShowLabelEditor(false);
    setCompletedDraft(selectedCard?.is_completed ?? false);
  }, [selectedCard?.description, selectedCard?.id, selectedCard?.is_completed]);

  useEffect(() => {
    if (selectedCard == null) {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.type.startsWith("image/"));

      if (item == null) {
        return;
      }

      const file = item.getAsFile();

      if (file == null) {
        return;
      }

      event.preventDefault();
      void uploadImageToCard(selectedCard.id, file);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedCardId(null);
      }
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedCard, supabase]);

  useEffect(() => {
    const closeContextMenu = () => {
      setContextMenu(null);
    };

    window.addEventListener("click", closeContextMenu);
    window.addEventListener("scroll", closeContextMenu, true);

    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("scroll", closeContextMenu, true);
    };
  }, []);

  const filteredLists = useMemo(() => {
    return boardData.lists
      .filter((list) => list.archived_at == null)
      .map((list) => ({
        ...list,
        cards: list.cards.filter((card) => {
          if (card.archived_at != null) {
            return false;
          }

          const matchesText =
            filterText.length === 0 ||
            card.title.toLowerCase().includes(filterText.toLowerCase()) ||
            (card.description ?? "").toLowerCase().includes(filterText.toLowerCase());

          const matchesLabel =
            selectedLabelId === "all" || card.labels.some((label) => label.id === selectedLabelId);

          return matchesText && matchesLabel;
        }),
      }));
  }, [boardData.lists, filterText, selectedLabelId]);

  function updateCardInState(cardId: string, updater: (card: CardRecord) => CardRecord) {
    setBoardData((current) => ({
      ...current,
      lists: current.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) => (card.id === cardId ? updater(card) : card)),
      })),
    }));
  }

  function restoreLists(snapshot: BoardPageData["lists"]) {
    setBoardData((current) => ({
      ...current,
      lists: snapshot,
    }));
  }

  function updateBoardSummary(updater: (board: BoardPageData["board"]) => BoardPageData["board"]) {
    setBoardData((current) => ({
      ...current,
      board: updater(current.board),
    }));
  }

  function createListsSnapshot() {
    return boardData.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        labels: [...card.labels],
        members: [...card.members],
        attachments: [...card.attachments],
        comments: [...card.comments],
        checklists: card.checklists.map((checklist) => ({
          ...checklist,
          items: [...checklist.items],
        })),
      })),
    }));
  }

  function getCompletedTargetListId(nextCompleted: boolean) {
    if (nextCompleted == false || boardData.board.completed_list_id == null) {
      return null;
    }

    return boardData.board.completed_list_id;
  }

  async function uploadImageToCard(cardId: string, file: File) {
    try {
      setIsUploadingPaste(true);
      setPasteStatus("uploading image from clipboard...");

      const extension = file.name.split(".").pop() ?? file.type.split("/")[1] ?? "png";
      const fileName = file.name.length > 0 ? file.name : `clipboard-${Date.now()}.${extension}`;
      const path = `cards/${cardId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("media").upload(path, file, {
        upsert: false,
        contentType: file.type,
      });

      if (uploadError != null) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(path);

      const { data: attachment, error: insertError } = await supabase
        .from("attachments")
        .insert({
          card_id: cardId,
          name: fileName,
          url: publicUrl,
        })
        .select("id, card_id, name, url, created_at")
        .single();

      if (insertError != null) {
        throw new Error(insertError.message);
      }

      updateCardInState(cardId, (card) => ({
        ...card,
        attachments: [attachment as Attachment, ...card.attachments],
      }));

      setPasteStatus("clipboard image attached.");
      router.refresh();
    } catch (error) {
      setPasteStatus(error instanceof Error ? error.message : "unable to attach clipboard image.");
    } finally {
      setIsUploadingPaste(false);
      window.setTimeout(() => {
        setPasteStatus((current) => (current === "clipboard image attached." ? null : current));
      }, 2500);
    }
  }

  async function runOptimisticBoardAction(run: () => Promise<void>, rollback: () => void, successMessage?: string) {
    try {
      setActionStatus(null);
      await run();
      if (successMessage != null) {
        setActionStatus(successMessage);
      }
      router.refresh();
    } catch (error) {
      rollback();
      setActionStatus(error instanceof Error ? error.message : "request failed.");
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    const id = String(event.active.id);

    if (type === "card") {
      setDraggedCardId(id);
      setDraggedListId(null);
      return;
    }

    if (type === "list") {
      setDraggedListId(id);
      setDraggedCardId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedCardId(null);
    setDraggedListId(null);

    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    if (overId == null || activeId === overId) {
      return;
    }

    const activeType = event.active.data.current?.type;
    const overType = event.over?.data.current?.type;

    if (activeType === "list" && overType === "list") {
      const listIds = filteredLists.map((list) => list.id);
      const oldIndex = listIds.indexOf(activeId);
      const newIndex = listIds.indexOf(overId);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const nextLists = arrayMove(filteredLists, oldIndex, newIndex);
      const nextIds = nextLists.map((list) => list.id);

      setBoardData((current) => ({
        ...current,
        lists: nextLists.concat(current.lists.filter((list) => list.archived_at != null)),
      }));

      startTransition(async () => {
        await moveListAction(boardData.board.id, nextIds);
        router.refresh();
      });

      return;
    }

    if (activeType === "card") {
      let sourceList: ListRecord | undefined;
      let targetList: ListRecord | undefined;

      for (const list of filteredLists) {
        if (list.cards.some((card) => card.id === activeId)) {
          sourceList = list;
        }

        if (list.cards.some((card) => card.id === overId) || list.id === overId) {
          targetList = list;
        }
      }

      if (sourceList == null || targetList == null) {
        return;
      }

      const activeCard = sourceList.cards.find((card) => card.id === activeId);

      if (activeCard == null) {
        return;
      }

      const sourceCards = [...sourceList.cards].filter((card) => card.id !== activeId);
      const targetCards = sourceList.id === targetList.id ? sourceCards : [...targetList.cards];
      const targetIndex = targetCards.findIndex((card) => card.id === overId);
      const insertIndex = targetIndex === -1 ? targetCards.length : targetIndex;
      targetCards.splice(insertIndex, 0, {
        ...activeCard,
        list_id: targetList.id,
      });

      const nextLists = filteredLists.map((list) => {
        if (list.id === sourceList?.id && list.id === targetList?.id) {
          return { ...list, cards: targetCards };
        }

        if (list.id === sourceList?.id) {
          return { ...list, cards: sourceCards };
        }

        if (list.id === targetList?.id) {
          return { ...list, cards: targetCards };
        }

        return list;
      });

      setBoardData((current) => ({
        ...current,
        lists: nextLists.concat(current.lists.filter((list) => list.archived_at != null)),
      }));

      startTransition(async () => {
        await moveCardAction(
          boardData.board.id,
          activeId,
          targetList.id,
          targetCards.map((card) => card.id),
        );
        router.refresh();
      });
    }
  };

  const labelOptions = [
    { value: "all", label: "all labels" },
    ...boardData.labels.map((label) => ({
      value: label.id,
      label: label.name,
      color: label.color,
    })),
  ];

  const completedListOptions = [
    { value: "", label: "no auto-move" },
    ...boardData.lists.filter((list) => list.archived_at == null).map((list) => ({
      value: list.id,
      label: list.title,
    })),
  ];

  function submitCreateList(formData: FormData, reset?: () => void) {
    const title = String(formData.get("title") ?? "").trim();

    if (title.length === 0) {
      return;
    }

    const snapshot = createListsSnapshot();
    const optimisticList: ListRecord = {
      id: `temp-${crypto.randomUUID()}`,
      board_id: boardData.board.id,
      title,
      position: boardData.lists.length,
      archived_at: null,
      cards: [],
    };

    setBoardData((current) => ({
      ...current,
      lists: [...current.lists, optimisticList],
    }));

    reset?.();
    setShowCreateList(false);

    startTransition(async () => {
      await runOptimisticBoardAction(
        async () => {
          await createListAction(formData);
        },
        () => restoreLists(snapshot),
        "list created.",
      );
    });
  }

  function submitSelectedCardUpdate(nextCompleted?: boolean) {
    if (selectedCard == null || cardFormRef.current == null) {
      return;
    }

    const formData = new FormData(cardFormRef.current);
    const snapshot = createListsSnapshot();
    const previousIsCompleted = completedDraft;
    const nextIsCompleted = nextCompleted ?? completedDraft;
    const patch = {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      start_at: null,
      due_at: null,
      cover_color: selectedCard.cover_color ?? null,
      is_completed: nextIsCompleted,
    };

    formData.set("coverColor", selectedCard.cover_color ?? "");
    formData.set("isCompleted", nextIsCompleted ? "true" : "false");

    const completedTargetListId = getCompletedTargetListId(patch.is_completed);
    const targetListLength = completedTargetListId == null
      ? 0
      : (boardData.lists.find((list) => list.id === completedTargetListId)?.cards.length ?? 0);

    setCompletedDraft(nextIsCompleted);
    setBoardData((current) => ({
      ...current,
      lists: current.lists.map((list) => {
        const cardToMove = list.cards.find((card) => card.id === selectedCard.id);

        if (cardToMove == null) {
          if (completedTargetListId != null && list.id === completedTargetListId) {
            return {
              ...list,
              cards: [
                ...list.cards,
                {
                  ...selectedCard,
                  ...patch,
                  list_id: completedTargetListId,
                  position: targetListLength,
                },
              ],
            };
          }

          return list;
        }

        if (completedTargetListId != null && list.id !== completedTargetListId) {
          return {
            ...list,
            cards: list.cards.filter((card) => card.id !== selectedCard.id),
          };
        }

        return {
          ...list,
          cards: list.cards.map((card) => (
            card.id === selectedCard.id
              ? {
                ...card,
                ...patch,
                list_id: completedTargetListId ?? card.list_id,
                position: completedTargetListId != null ? targetListLength : card.position,
              }
              : card
          )),
        };
      }),
    }));

    startTransition(async () => {
      await runOptimisticBoardAction(
        async () => {
          await updateCardAction(formData);
        },
        () => {
          restoreLists(snapshot);
          setCompletedDraft(previousIsCompleted);
        },
        nextCompleted == null ? "card saved." : nextIsCompleted ? "card completed." : "card reopened.",
      );
    });
  }

  return (
    <div className="min-h-screen grainy-bg px-4 py-5 sm:px-6 lowercase">
      <div
        className={`mx-auto max-w-[1600px] transition duration-200 ${(selectedCard || showBoardSettings || showCreateList) ? "pointer-events-none blur-sm" : ""}`}
      >
        <header className="mb-5 border border-[var(--border)] bg-[var(--panel)] px-6 py-5 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link href="/dashboard" className="text-sm text-white/70">
                back to dashboard
              </Link>
              <p className="mt-3 text-xs tracking-[0.3em] text-white/55">
                {boardData.board.workspace.name}
              </p>
              <h1 className="mt-2 text-4xl font-semibold">
                {boardData.board.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                {boardData.board.description ?? "Shared lists, cards, checklists, comments, labels, and activity."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={filterText}
                onChange={(event) => setFilterText(event.target.value)}
                placeholder="search cards"
                className="surface bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/45"
              />
              <CustomDropdown value={selectedLabelId} onChange={setSelectedLabelId} options={labelOptions} />
              <div className="surface bg-transparent px-4 py-3 text-sm text-white/80">
                {boardData.members.length} collaborators
              </div>
              <button
                type="button"
                onClick={() => setShowActivity((current) => current == false)}
                className={`surface inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition ${
                  showActivity ? "border-[var(--border-strong)] text-[#c4d3ff]" : "text-white/80"
                }`}
              >
                <Activity className="h-4 w-4" />
                {showActivity ? "hide activity" : "show activity"}
              </button>
              <button
                type="button"
                onClick={() => setShowBoardSettings(true)}
                className="surface flex cursor-pointer items-center justify-center gap-2 px-4 py-3 text-sm text-white/80 transition hover:border-[var(--border-strong)]"
              >
                <Settings2 className="h-4 w-4" />
                board settings
              </button>
            </div>
          </div>
        </header>

        <main className="grid gap-5">
          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              setDraggedCardId(null);
              setDraggedListId(null);
            }}
          >
            <SortableContext items={filteredLists.map((list) => list.id)} strategy={horizontalListSortingStrategy}>
              <div className="soft-scrollbar flex min-h-[72vh] items-start gap-4 overflow-x-auto pb-4">
                {filteredLists.map((list) => (
                  <SortableListShell key={list.id} id={list.id}>
                    <section className="panel flex min-h-[14rem] w-full min-w-0 flex-col overflow-hidden p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <form action={updateListTitleAction} className="flex-1">
                          <input type="hidden" name="boardId" value={boardData.board.id} />
                          <input type="hidden" name="listId" value={list.id} />
                          <input name="title" defaultValue={list.title} className="w-full bg-transparent px-2 py-1 font-semibold outline-none" />
                        </form>

                        <form action={archiveListAction}>
                          <input type="hidden" name="boardId" value={boardData.board.id} />
                          <input type="hidden" name="listId" value={list.id} />
                          <button className="p-2 text-[var(--muted)] transition hover:bg-white/5" aria-label="Archive list">
                            <Archive className="h-4 w-4" />
                          </button>
                        </form>
                      </div>

                      <SortableContext items={list.cards.map((card) => card.id)} strategy={rectSortingStrategy}>
                        <div className="grid gap-3 pr-1">
                          {list.cards.map((card) => {
                            const coverImage = card.attachments.find((attachment) => isImageUrl(attachment.url));

                            return (
                              <SortableCardShell key={card.id} id={card.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedCardId(card.id)}
                                  onContextMenu={(event) => {
                                    event.preventDefault();
                                    setContextMenu({
                                      cardId: card.id,
                                      x: event.clientX,
                                      y: event.clientY,
                                    });
                                  }}
                                  className={`w-full min-w-0 overflow-hidden p-4 text-left transition hover:-translate-y-0.5 ${
                                    card.is_completed
                                      ? "surface border-[var(--border-strong)] bg-[var(--accent-soft)] shadow-[inset_0_0_0_1px_rgba(79,126,255,0.12)]"
                                      : "surface"
                                  }`}
                                >
                                  {coverImage ? (
                                    <img
                                      src={coverImage.url}
                                      alt={coverImage.name}
                                      className="mb-3 h-36 w-full object-cover"
                                    />
                                  ) : card.cover_color ? (
                                    <div className="mb-3 h-2" style={{ background: card.cover_color }} />
                                  ) : null}

                                  <div className="flex flex-wrap gap-2">
                                    {card.labels.map((label) => (
                                      <span key={label.id} className="px-2.5 py-1 text-xs font-medium text-white" style={{ background: label.color }}>
                                        {label.name}
                                      </span>
                                    ))}
                                  </div>

                                  <div className="mt-3 flex items-start justify-between gap-3">
                                    <h3 className={`min-w-0 break-words font-medium ${card.is_completed ? "text-[#c4d3ff]" : ""}`}>{card.title}</h3>
                                    {card.is_completed ? (
                                      <span className="inline-flex shrink-0 items-center justify-center border border-[var(--border-strong)] bg-[var(--accent-soft)] p-1 text-[#a9c0ff]">
                                        <Check className="h-4 w-4" />
                                      </span>
                                    ) : null}
                                  </div>
                                  {card.description ? (
                                    <p className={`mt-2 line-clamp-2 text-sm ${card.is_completed ? "text-[#9fb6ff]" : "text-[var(--muted)]"}`}>{card.description}</p>
                                  ) : null}

                                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                                    {card.comments.length > 0 ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        {card.comments.length}
                                      </span>
                                    ) : null}
                                    {card.attachments.length > 0 ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <Paperclip className="h-3.5 w-3.5" />
                                        {card.attachments.length}
                                      </span>
                                    ) : null}
                                    {card.checklists.length > 0 ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <CheckSquare className="h-3.5 w-3.5" />
                                        {card.checklists.reduce((total, checklist) => total + checklist.items.filter((item) => item.is_done).length, 0)}
                                        /
                                        {card.checklists.reduce((total, checklist) => total + checklist.items.length, 0)}
                                      </span>
                                    ) : null}
                                    {card.members.length > 0 ? (
                                      <div className="ml-auto flex items-center">
                                        {card.members.slice(0, 4).map((member, index) => (
                                          member.avatar_url ? (
                                            <img
                                              key={member.id}
                                              src={member.avatar_url}
                                              alt=""
                                              className="avatar-ring h-7 w-7 object-cover"
                                              style={{ marginLeft: index === 0 ? 0 : -8 }}
                                            />
                                          ) : (
                                            <div
                                              key={member.id}
                                              className="avatar-ring flex h-7 w-7 items-center justify-center bg-[var(--surface-soft)] text-[9px] text-white"
                                              style={{ marginLeft: index === 0 ? 0 : -8 }}
                                            >
                                              {(member.full_name ?? member.email).slice(0, 2)}
                                            </div>
                                          )
                                        ))}
                                        {card.members.length > 4 ? (
                                          <div className="avatar-ring ml-[-8px] flex h-7 w-7 items-center justify-center bg-[var(--surface-soft)] text-[9px] text-white">
                                            +{card.members.length - 4}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                </button>
                              </SortableCardShell>
                            );
                          })}
                        </div>
                      </SortableContext>

                      <form
                        className="mt-4 grid gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          const title = String(formData.get("title") ?? "").trim();

                          if (title.length === 0) {
                            return;
                          }

                          const snapshot = createListsSnapshot();
                          const optimisticCard: CardRecord = {
                            id: `temp-${crypto.randomUUID()}`,
                            board_id: boardData.board.id,
                            list_id: list.id,
                            title,
                            description: null,
                            position: list.cards.length,
                            due_at: null,
                            start_at: null,
                            cover_color: null,
                            archived_at: null,
                            is_completed: false,
                            labels: [],
                            members: currentProfile ? [currentProfile] : [],
                            attachments: [],
                            comments: [],
                            checklists: [],
                          };

                          setBoardData((current) => ({
                            ...current,
                            lists: current.lists.map((entry) => (
                              entry.id === list.id
                                ? { ...entry, cards: [...entry.cards, optimisticCard] }
                                : entry
                            )),
                          }));

                          event.currentTarget.reset();

                          startTransition(async () => {
                            await runOptimisticBoardAction(
                              async () => {
                                await createCardAction(formData);
                              },
                              () => restoreLists(snapshot),
                              "card created.",
                            );
                          });
                        }}
                      >
                        <input type="hidden" name="boardId" value={boardData.board.id} />
                        <input type="hidden" name="listId" value={list.id} />
                        <input name="title" required placeholder="add a card" className="surface px-4 py-3 text-sm" />
                        <button className="inline-flex items-center justify-center gap-2 bg-[linear-gradient(135deg,#5c87ff,#3d6cff)] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90">
                          <Plus className="h-4 w-4" />
                          add card
                        </button>
                      </form>
                    </section>
                  </SortableListShell>
                ))}

                <div className="flex h-fit w-fit shrink-0 items-start pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateList(true)}
                    className="surface flex h-12 w-12 items-center justify-center text-white transition hover:border-[var(--border-strong)]"
                    aria-label="Add another list"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </SortableContext>
            <DragOverlay zIndex={9999}>
              {draggedCard ? (
                <div className="surface drag-overlay-card w-[320px] p-4 text-left shadow-[0_35px_120px_rgba(0,0,0,0.7)]">
                  {(() => {
                    const coverImage = draggedCard.attachments.find((attachment) => isImageUrl(attachment.url));

                    return coverImage ? (
                      <img
                        src={coverImage.url}
                        alt={coverImage.name}
                        className="mb-3 h-36 w-full object-cover"
                      />
                    ) : draggedCard.cover_color ? (
                      <div className="mb-3 h-2" style={{ background: draggedCard.cover_color }} />
                    ) : null;
                  })()}

                  <div className="flex flex-wrap gap-2">
                    {draggedCard.labels.map((label) => (
                      <span key={label.id} className="px-2.5 py-1 text-xs font-medium text-white" style={{ background: label.color }}>
                        {label.name}
                      </span>
                    ))}
                  </div>

                  <h3 className="mt-3 font-medium">{draggedCard.title}</h3>
                  {draggedCard.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{draggedCard.description}</p>
                  ) : null}
                </div>
              ) : draggedList ? (
                <section className="panel drag-overlay-card flex w-[320px] flex-col p-4 shadow-[0_35px_120px_rgba(0,0,0,0.7)]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex-1 px-2 py-1 font-semibold">
                      {draggedList.title}
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {draggedList.cards.slice(0, 3).map((card) => (
                      <div key={card.id} className="surface p-4 text-sm">
                        {card.title}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </DragOverlay>
          </DndContext>

          {showActivity ? (
            <section className="panel p-5">
              <p className="text-xs tracking-[0.25em] text-[var(--muted)]">board activity</p>
              <h2 className="mt-2 text-2xl font-semibold">recent moves</h2>
              <div className="mt-4 grid gap-3">
                {boardData.activities.map((activity) => (
                  <div key={activity.id} className="surface p-4">
                    <p className="font-medium">{activity.profile.full_name ?? activity.profile.email}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{activity.details ?? activity.action}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">{formatTimestamp(activity.created_at)}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>

      {contextMenu != null && contextMenuCard != null ? (
        <div
          className="fixed z-[120] min-w-56 border border-[var(--border)] bg-[var(--panel)] p-2 text-sm text-white shadow-[0_30px_120px_rgba(0,0,0,0.65)]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedCardId(contextMenuCard.id);
              setContextMenu(null);
            }}
            className="surface w-full px-4 py-3 text-left"
          >
            open card
          </button>
          <button
            type="button"
            onClick={() => {
              const snapshot = createListsSnapshot();
              const nextCompleted = contextMenuCard.is_completed == false;
              const completedTargetListId = getCompletedTargetListId(nextCompleted);
              const targetListLength = completedTargetListId == null
                ? 0
                : (boardData.lists.find((list) => list.id === completedTargetListId)?.cards.length ?? 0);

              setBoardData((current) => ({
                ...current,
                lists: current.lists.map((list) => {
                  const cardToMove = list.cards.find((card) => card.id === contextMenuCard.id);

                  if (cardToMove == null) {
                    if (completedTargetListId != null && list.id === completedTargetListId) {
                      return {
                        ...list,
                        cards: [...list.cards, { ...contextMenuCard, is_completed: true, list_id: completedTargetListId, position: targetListLength }],
                      };
                    }

                    return list;
                  }

                  if (completedTargetListId != null && list.id !== completedTargetListId) {
                    return {
                      ...list,
                      cards: list.cards.filter((card) => card.id !== contextMenuCard.id),
                    };
                  }

                  return {
                    ...list,
                    cards: list.cards.map((card) => (
                      card.id === contextMenuCard.id
                        ? {
                          ...card,
                          is_completed: nextCompleted,
                          list_id: completedTargetListId ?? card.list_id,
                          position: completedTargetListId != null ? targetListLength : card.position,
                        }
                        : card
                    )),
                  };
                }),
              }));

              setContextMenu(null);

              startTransition(async () => {
                const formData = new FormData();
                formData.set("boardId", boardData.board.id);
                formData.set("cardId", contextMenuCard.id);
                formData.set("title", contextMenuCard.title);
                formData.set("description", contextMenuCard.description ?? "");
                formData.set("coverColor", contextMenuCard.cover_color ?? "");
                if (nextCompleted) {
                  formData.set("isCompleted", "true");
                }

                await runOptimisticBoardAction(
                  async () => {
                    await updateCardAction(formData);
                  },
                  () => restoreLists(snapshot),
                  nextCompleted ? "card completed." : "card reopened.",
                );
              });
            }}
            className="surface mt-2 w-full px-4 py-3 text-left"
          >
            {contextMenuCard.is_completed ? "mark incomplete" : "mark complete"}
          </button>
          <button
            type="button"
            onClick={() => {
              const snapshot = createListsSnapshot();
              setBoardData((current) => ({
                ...current,
                lists: current.lists.map((list) => ({
                  ...list,
                  cards: list.cards.filter((card) => card.id !== contextMenuCard.id),
                })),
              }));
              setContextMenu(null);

              startTransition(async () => {
                const formData = new FormData();
                formData.set("boardId", boardData.board.id);
                formData.set("cardId", contextMenuCard.id);

                await runOptimisticBoardAction(
                  async () => {
                    await archiveCardAction(formData);
                  },
                  () => restoreLists(snapshot),
                  "card archived.",
                );
              });
            }}
            className="surface mt-2 w-full border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-left text-[var(--danger)]"
          >
            archive card
          </button>
        </div>
      ) : null}

      {selectedCard ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
          onClick={() => setSelectedCardId(null)}
        >
          <div
            className="panel w-full max-w-6xl text-white shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div className="min-w-0">
                <p className="text-xs tracking-[0.25em] text-[var(--muted)]">card details</p>
                <h2 className="mt-2 break-words text-3xl font-semibold">{selectedCard.title}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {selectedCard.labels.map((label) => (
                    <span key={label.id} className="px-2.5 py-1 text-xs font-medium text-white" style={{ background: label.color }}>
                      {label.name}
                    </span>
                  ))}
                  {selectedCard.members.length > 0 ? (
                    <div className="flex items-center">
                      {selectedCard.members.slice(0, 5).map((member, index) => (
                        member.avatar_url ? (
                          <img
                            key={member.id}
                            src={member.avatar_url}
                            alt=""
                            className="avatar-ring h-8 w-8 object-cover"
                            style={{ marginLeft: index === 0 ? 0 : -8 }}
                          />
                        ) : (
                          <div
                            key={member.id}
                            className="avatar-ring flex h-8 w-8 items-center justify-center bg-[var(--surface-soft)] text-[10px] text-white"
                            style={{ marginLeft: index === 0 ? 0 : -8 }}
                          >
                            {(member.full_name ?? member.email).slice(0, 2)}
                          </div>
                        )
                      ))}
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  paste an image from your clipboard anywhere in this window to attach it instantly.
                </p>
                {pasteStatus ? (
                  <p className="mt-2 text-xs text-[#a9c0ff]">{pasteStatus}</p>
                ) : null}
                {actionStatus ? (
                  <p className="mt-2 text-xs text-[#a9c0ff]">{actionStatus}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLabelEditor((current) => current == false)}
                  className={`surface p-3 transition ${showLabelEditor ? "border-[var(--border-strong)] text-[#c4d3ff]" : "text-white/80"}`}
                  aria-label="Toggle labels"
                >
                  <Tags className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    submitSelectedCardUpdate(completedDraft == false);
                  }}
                  className={`surface p-3 transition ${completedDraft ? "border-[var(--border-strong)] bg-[var(--accent-soft)] text-[#c4d3ff]" : "text-white/80"}`}
                  aria-label="Toggle completed"
                  aria-pressed={completedDraft}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCardId(null)}
                  className="surface p-3"
                  aria-label="Close card details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="soft-scrollbar max-h-[calc(100vh-8rem)] overflow-y-auto px-6 py-5">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="grid gap-6">
                  {showLabelEditor ? (
                    <section className="surface grid gap-3 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">labels</h3>
                        <form action={createLabelAction} className="flex items-center gap-2">
                          <input type="hidden" name="boardId" value={boardData.board.id} />
                          <input name="name" required placeholder="urgent" className="surface w-28 px-3 py-2 text-xs" />
                          <label className="surface flex h-9 w-12 items-center justify-center px-2 py-2">
                            <input
                              name="color"
                              type="color"
                              defaultValue="#4f7eff"
                              className="h-5 w-8 cursor-pointer border-0 bg-transparent p-0"
                              aria-label="Label color"
                            />
                          </label>
                          <button className="surface px-3 py-2 text-xs">add</button>
                        </form>
                      </div>
                      <div className="grid gap-2">
                        {boardData.labels.map((label) => {
                          const active = selectedCard.labels.some((item) => item.id === label.id);

                          return (
                            <button
                              key={label.id}
                              type="button"
                              onClick={() => {
                                const snapshot = createListsSnapshot();
                                updateCardInState(selectedCard.id, (card) => ({
                                  ...card,
                                  labels: active
                                    ? card.labels.filter((item) => item.id !== label.id)
                                    : [...card.labels, label],
                                }));

                                startTransition(async () => {
                                  await runOptimisticBoardAction(
                                    async () => {
                                      await toggleCardLabelAction(selectedCard.id, label.id, active == false, boardData.board.id);
                                    },
                                    () => restoreLists(snapshot),
                                  );
                                });
                              }}
                              className="surface flex items-center justify-between px-4 py-3 text-sm"
                            >
                              <span className="inline-flex items-center gap-2">
                                <span className="h-3 w-3" style={{ background: label.color }} />
                                {label.name}
                              </span>
                              <span>{active ? "on" : "off"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  <form
                    ref={cardFormRef}
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitSelectedCardUpdate();
                    }}
                  >
                    <input type="hidden" name="boardId" value={boardData.board.id} />
                    <input type="hidden" name="cardId" value={selectedCard.id} />
                    <input type="hidden" name="coverColor" value={selectedCard.cover_color ?? ""} />
                    <input type="hidden" name="isCompleted" value={completedDraft ? "true" : "false"} />
                    <input name="title" defaultValue={selectedCard.title} required className="surface px-4 py-3" />
                    <MentionInput
                      name="description"
                      value={descriptionDraft}
                      onChange={setDescriptionDraft}
                      profiles={boardData.members.map((member) => member.profile)}
                      rows={6}
                      placeholder="describe the work, acceptance criteria, links, notes. use @handles to ping people."
                      className="surface min-w-full max-w-full resize overflow-auto px-4 py-3"
                    />
                    <button className="bg-[linear-gradient(135deg,#5c87ff,#3d6cff)] px-4 py-3 font-medium text-white">
                      save card
                    </button>
                  </form>

                  <section className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">members</h3>
                      <span className="text-xs text-[var(--muted)]">
                        mention with {boardData.members.map((member) => `@${getProfileHandle(member.profile)}`).join(", ")}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {boardData.members.map((member) => {
                        const active = selectedCard.members.some((profile) => profile.id === member.profile.id);

                        return (
                          <button
                            key={member.profile.id}
                            type="button"
                            onClick={() => {
                              const snapshot = createListsSnapshot();
                              updateCardInState(selectedCard.id, (card) => ({
                                ...card,
                                members: active
                                  ? card.members.filter((profile) => profile.id !== member.profile.id)
                                  : [...card.members, member.profile],
                              }));

                              startTransition(async () => {
                                await runOptimisticBoardAction(
                                  async () => {
                                    await toggleCardMemberAction(selectedCard.id, member.profile.id, active == false, boardData.board.id);
                                  },
                                  () => restoreLists(snapshot),
                                );
                              });
                            }}
                            className={`flex items-center justify-between border px-4 py-3 text-sm transition ${
                              active ? "border-[var(--border-strong)] bg-[var(--accent-soft)] text-[#c4d3ff]" : "surface"
                            }`}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {member.profile.full_name ?? member.profile.email}
                            </span>
                            <span>{member.role}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">attachments and images</h3>
                      <span className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
                        <ClipboardPaste className="h-4 w-4" />
                        {isUploadingPaste ? "uploading..." : "paste to attach"}
                      </span>
                    </div>
                    <div className="surface p-4 text-sm text-[var(--muted)]">
                      paste an image from your clipboard while this card is open and it will attach here automatically.
                    </div>
                    <form action={addAttachmentAction} className="surface grid gap-2 p-4">
                      <input type="hidden" name="boardId" value={boardData.board.id} />
                      <input type="hidden" name="cardId" value={selectedCard.id} />
                      <input name="name" required placeholder="figma spec" className="surface px-4 py-3 text-sm" />
                      <input name="url" type="url" required placeholder="https://..." className="surface px-4 py-3 text-sm" />
                      <button className="surface px-4 py-3 font-medium">add attachment</button>
                    </form>
                    <form action={uploadCardImageAction} className="surface grid gap-2 p-4">
                      <input type="hidden" name="boardId" value={boardData.board.id} />
                      <input type="hidden" name="cardId" value={selectedCard.id} />
                      <label className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-[var(--muted)]">
                        <ImageUp className="h-4 w-4" />
                        upload manually
                      </label>
                      <FileInput name="image" accept="image/*" buttonLabel="choose file" />
                      <button className="surface px-4 py-3 font-medium">upload image</button>
                    </form>
                    <div className="grid gap-2">
                      {selectedCard.attachments.map((attachment) => (
                        <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="surface grid gap-3 px-4 py-3 text-sm">
                          {isImageUrl(attachment.url) ? (
                            <img src={attachment.url} alt={attachment.name} className="max-h-64 w-full object-cover" />
                          ) : null}
                          <span>{attachment.name}</span>
                        </a>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="grid gap-6">
                  <section className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">comments</h3>
                    </div>
                    <form
                      className="grid gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        const body = String(formData.get("body") ?? "").trim();

                        if (body.length === 0 || currentProfile == null) {
                          return;
                        }

                        const snapshot = createListsSnapshot();
                        const optimisticComment = {
                          id: `temp-${crypto.randomUUID()}`,
                          card_id: selectedCard.id,
                          body,
                          created_at: new Date().toISOString(),
                          profile: currentProfile,
                        };

                        updateCardInState(selectedCard.id, (card) => ({
                          ...card,
                          comments: [optimisticComment, ...card.comments],
                        }));

                        setCommentDraft("");

                        startTransition(async () => {
                          await runOptimisticBoardAction(
                            async () => {
                              await addCommentAction(formData);
                            },
                            () => restoreLists(snapshot),
                            "comment posted.",
                          );
                        });
                      }}
                    >
                      <input type="hidden" name="boardId" value={boardData.board.id} />
                      <input type="hidden" name="cardId" value={selectedCard.id} />
                      <MentionInput
                        name="body"
                        value={commentDraft}
                        onChange={setCommentDraft}
                        profiles={boardData.members.map((member) => member.profile)}
                        rows={4}
                        required
                        placeholder="leave an update for the team. use @handles to ping people."
                        className="surface min-w-full max-w-full resize overflow-auto px-4 py-3"
                      />
                      <button className="surface px-4 py-3 font-medium">post comment</button>
                    </form>
                    <div className="grid gap-3">
                      {selectedCard.comments.map((comment) => (
                        <div key={comment.id} className="surface p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              {comment.profile.avatar_url ? (
                                <img src={comment.profile.avatar_url} alt="" className="avatar-ring h-9 w-9 shrink-0 object-cover" />
                              ) : (
                                <div className="avatar-ring flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--surface-soft)] text-xs">
                                  {(comment.profile.full_name ?? comment.profile.email).slice(0, 2)}
                                </div>
                              )}
                              <p className="min-w-0 break-words font-medium">{comment.profile.full_name ?? comment.profile.email}</p>
                            </div>
                            <span className="text-xs text-[var(--muted)]">{formatTimestamp(comment.created_at)}</span>
                          </div>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            <MentionText text={comment.body} />
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">checklists</h3>
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          const title = String(formData.get("title") ?? "").trim();

                          if (title.length === 0) {
                            return;
                          }

                          const snapshot = createListsSnapshot();
                          const optimisticChecklist = {
                            id: `temp-${crypto.randomUUID()}`,
                            card_id: selectedCard.id,
                            title,
                            position: selectedCard.checklists.length,
                            items: [],
                          };

                          updateCardInState(selectedCard.id, (card) => ({
                            ...card,
                            checklists: [...card.checklists, optimisticChecklist],
                          }));

                          event.currentTarget.reset();

                          startTransition(async () => {
                            await runOptimisticBoardAction(
                              async () => {
                                await createChecklistAction(formData);
                              },
                              () => restoreLists(snapshot),
                              "checklist added.",
                            );
                          });
                        }}
                      >
                        <input type="hidden" name="boardId" value={boardData.board.id} />
                        <input type="hidden" name="cardId" value={selectedCard.id} />
                        <input name="title" required placeholder="tasks" className="surface w-28 px-3 py-2 text-xs" />
                        <button className="surface px-3 py-2 text-xs">add</button>
                      </form>
                    </div>

                    {selectedCard.checklists.map((checklist) => (
                      <div key={checklist.id} className="surface p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-medium">{checklist.title}</h4>
                          <span className="text-xs text-[var(--muted)]">
                            {checklist.items.filter((item) => item.is_done).length}/{checklist.items.length}
                          </span>
                        </div>
                        <div className="grid gap-2">
                          {checklist.items.map((item) => (
                            <label key={item.id} className="surface flex items-center gap-3 px-3 py-2 text-sm">
                              <input
                                type="checkbox"
                                checked={item.is_done}
                                onChange={(event) => {
                                  const snapshot = createListsSnapshot();
                                  updateCardInState(selectedCard.id, (card) => ({
                                    ...card,
                                    checklists: card.checklists.map((entry) => (
                                      entry.id === checklist.id
                                        ? {
                                          ...entry,
                                          items: entry.items.map((checklistItem) => (
                                            checklistItem.id === item.id
                                              ? { ...checklistItem, is_done: event.target.checked }
                                              : checklistItem
                                          )),
                                        }
                                        : entry
                                    )),
                                  }));

                                  startTransition(async () => {
                                    await runOptimisticBoardAction(
                                      async () => {
                                        await toggleChecklistItemAction(item.id, event.target.checked, boardData.board.id);
                                      },
                                      () => restoreLists(snapshot),
                                    );
                                  });
                                }}
                              />
                              <span className={item.is_done ? "line-through text-[var(--muted)]" : ""}>{item.text}</span>
                            </label>
                          ))}
                        </div>
                        <form
                          className="mt-3 flex gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const formData = new FormData(event.currentTarget);
                            const text = String(formData.get("text") ?? "").trim();

                            if (text.length === 0) {
                              return;
                            }

                            const snapshot = createListsSnapshot();
                            const optimisticItem = {
                              id: `temp-${crypto.randomUUID()}`,
                              checklist_id: checklist.id,
                              text,
                              position: checklist.items.length,
                              is_done: false,
                            };

                            updateCardInState(selectedCard.id, (card) => ({
                              ...card,
                              checklists: card.checklists.map((entry) => (
                                entry.id === checklist.id
                                  ? { ...entry, items: [...entry.items, optimisticItem] }
                                  : entry
                              )),
                            }));

                            event.currentTarget.reset();

                            startTransition(async () => {
                              await runOptimisticBoardAction(
                                async () => {
                                  await addChecklistItemAction(formData);
                                },
                                () => restoreLists(snapshot),
                                "checklist item added.",
                              );
                            });
                          }}
                        >
                          <input type="hidden" name="boardId" value={boardData.board.id} />
                          <input type="hidden" name="cardId" value={selectedCard.id} />
                          <input type="hidden" name="checklistId" value={checklist.id} />
                          <input name="text" required placeholder="add item" className="surface min-w-0 flex-1 px-3 py-2 text-sm" />
                          <button className="surface px-3 py-2 text-sm">add</button>
                        </form>
                      </div>
                    ))}
                  </section>

                  <form action={archiveCardAction}>
                    <input type="hidden" name="boardId" value={boardData.board.id} />
                    <input type="hidden" name="cardId" value={selectedCard.id} />
                    <button className="w-full border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 font-medium text-[var(--danger)]">
                      archive card
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showBoardSettings ? (
        <div className="fixed inset-0 z-[170] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close board settings"
            onClick={() => setShowBoardSettings(false)}
            className="absolute inset-0 bg-black/55"
          />
          <div className="relative z-[171] w-full max-w-xl border border-[var(--border-strong)] bg-[var(--panel)] p-6 text-white shadow-[0_35px_140px_rgba(0,0,0,0.72)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.25em] text-[var(--muted)]">board settings</p>
                <h2 className="mt-2 text-3xl font-semibold">{boardData.board.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBoardSettings(false)}
                className="surface p-3 text-white/80 transition hover:border-[var(--border-strong)]"
                aria-label="Close board settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const nextValue = String(formData.get("completedListId") ?? "").trim() || null;
                const previousValue = boardData.board.completed_list_id;

                updateBoardSummary((board) => ({
                  ...board,
                  completed_list_id: nextValue,
                }));

                startTransition(async () => {
                  await runOptimisticBoardAction(
                    async () => {
                      await updateBoardSettingsAction(formData);
                    },
                    () => {
                      updateBoardSummary((board) => ({
                        ...board,
                        completed_list_id: previousValue,
                      }));
                    },
                    "board settings saved.",
                  );
                });
              }}
              className="mt-6 grid gap-3"
            >
              <input type="hidden" name="boardId" value={boardData.board.id} />
              <label className="grid gap-2 text-xs tracking-[0.2em] text-[var(--muted)]">
                <span>send completed items to</span>
                <CustomDropdown
                  name="completedListId"
                  value={boardData.board.completed_list_id ?? ""}
                  onChange={(nextValue) => {
                    updateBoardSummary((board) => ({
                      ...board,
                      completed_list_id: nextValue.length > 0 ? nextValue : null,
                    }));
                  }}
                  options={completedListOptions}
                />
              </label>
              <button className="surface px-4 py-3 text-sm font-medium">save settings</button>
            </form>

            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <p className="text-xs tracking-[0.25em] text-[var(--danger)]">danger zone</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                type <span className="text-white">{boardData.board.name}</span> to permanently delete this board.
              </p>
              <form action={deleteBoardAction} className="mt-4 grid gap-3">
                <input type="hidden" name="boardId" value={boardData.board.id} />
                <input type="hidden" name="boardName" value={boardData.board.name} />
                <input
                  name="confirmation"
                  required
                  placeholder={boardData.board.name}
                  className="surface px-4 py-3 text-sm"
                />
                <button className="border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm font-medium text-[var(--danger)]">
                  delete board
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateList ? (
        <div className="fixed inset-0 z-[172] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close create list"
            onClick={() => setShowCreateList(false)}
            className="absolute inset-0 bg-black/55"
          />
          <div className="relative z-[173] w-full max-w-lg border border-[var(--border-strong)] bg-[var(--panel)] p-6 text-white shadow-[0_35px_140px_rgba(0,0,0,0.72)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.25em] text-[var(--muted)]">create list</p>
                <h2 className="mt-2 text-3xl font-semibold">add another list</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateList(false)}
                className="surface p-3 text-white/80 transition hover:border-[var(--border-strong)]"
                aria-label="Close create list"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="mt-6 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                submitCreateList(formData, () => event.currentTarget.reset());
              }}
            >
              <input type="hidden" name="boardId" value={boardData.board.id} />
              <input
                name="title"
                required
                autoFocus
                placeholder="ideas, doing, done"
                className="surface px-4 py-3 text-sm"
              />
              <button className="surface px-4 py-3 text-sm font-medium transition hover:border-[var(--border-strong)]">
                create list
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
