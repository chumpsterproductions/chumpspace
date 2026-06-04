"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { getProfileHandle } from "@/lib/utils";

type MentionMatch = {
  start: number;
  query: string;
};

function getMentionMatch(text: string, caret: number): MentionMatch | null {
  const beforeCaret = text.slice(0, caret);
  const match = beforeCaret.match(/(?:^|[\s\n(])@([a-z0-9._-]*)$/i);

  if (match == null) {
    return null;
  }

  return {
    start: beforeCaret.length - match[1].length - 1,
    query: match[1].toLowerCase(),
  };
}

export function MentionInput({
  name,
  value,
  onChange,
  profiles,
  rows,
  placeholder,
  className,
  required,
}: {
  name: string;
  value: string;
  onChange: (nextValue: string) => void;
  profiles: Profile[];
  rows: number;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionMatch, setMentionMatch] = useState<MentionMatch | null>(null);

  const suggestions = useMemo(() => {
    if (mentionMatch == null) {
      return [];
    }

    const query = mentionMatch.query;

    return profiles
      .map((profile) => ({
        profile,
        handle: getProfileHandle(profile),
      }))
      .filter((entry) => query.length === 0 || entry.handle.includes(query))
      .slice(0, 6);
  }, [mentionMatch, profiles]);

  useEffect(() => {
    if (suggestions.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => Math.min(current, suggestions.length - 1));
  }, [suggestions]);

  function refreshMentionMatch(nextValue?: string, nextCaret?: number) {
    const textarea = textareaRef.current;

    if (textarea == null) {
      setMentionMatch(null);
      return;
    }

    const valueToUse = nextValue ?? textarea.value;
    const caretToUse = nextCaret ?? textarea.selectionStart ?? valueToUse.length;
    setMentionMatch(getMentionMatch(valueToUse, caretToUse));
  }

  function applySuggestion(handle: string) {
    const textarea = textareaRef.current;

    if (textarea == null || mentionMatch == null) {
      return;
    }

    const selectionEnd = textarea.selectionStart ?? value.length;
    const nextValue = `${value.slice(0, mentionMatch.start)}@${handle} ${value.slice(selectionEnd)}`;
    const nextCaret = mentionMatch.start + handle.length + 2;

    onChange(nextValue);
    setMentionMatch(null);

    window.requestAnimationFrame(() => {
      if (textareaRef.current == null) {
        return;
      }

      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCaret, nextCaret);
    });
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className={className}
        onChange={(event) => {
          onChange(event.target.value);
          refreshMentionMatch(event.target.value, event.target.selectionStart ?? event.target.value.length);
        }}
        onClick={() => refreshMentionMatch()}
        onFocus={() => refreshMentionMatch()}
        onKeyUp={() => refreshMentionMatch()}
        onBlur={() => {
          window.setTimeout(() => {
            setMentionMatch(null);
          }, 100);
        }}
        onKeyDown={(event) => {
          if (suggestions.length === 0) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % suggestions.length);
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
            return;
          }

          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            applySuggestion(suggestions[activeIndex].handle);
            return;
          }

          if (event.key === "Escape") {
            setMentionMatch(null);
          }
        }}
      />

      {suggestions.length > 0 ? (
        <div className="mention-menu absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 border border-[var(--border-strong)] bg-[var(--panel)] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.profile.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                applySuggestion(suggestion.handle);
              }}
              className={`mention-menu__item flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                index === activeIndex ? "border-[var(--border-strong)] bg-[var(--accent-soft)] text-[#c4d3ff]" : "surface"
              }`}
            >
              {suggestion.profile.avatar_url ? (
                <img src={suggestion.profile.avatar_url} alt="" className="avatar-ring h-8 w-8 shrink-0 object-cover" />
              ) : (
                <div className="avatar-ring flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--surface-soft)] text-[10px]">
                  {(suggestion.profile.full_name ?? suggestion.profile.email).slice(0, 2)}
                </div>
              )}
              <span className="min-w-0">
                <span className="block truncate text-white">@{suggestion.handle}</span>
                <span className="block truncate text-xs text-[var(--muted)]">
                  {suggestion.profile.full_name ?? suggestion.profile.email}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
