import { renderMentions } from "@/lib/utils";

export function MentionText({ text }: { text: string }) {
  const parts = renderMentions(text);

  return (
    <>
      {parts.map((part) =>
        part.isMention ? (
          <span key={part.id} className="mention">
            {part.value}
          </span>
        ) : (
          <span key={part.id}>{part.value}</span>
        ),
      )}
    </>
  );
}
