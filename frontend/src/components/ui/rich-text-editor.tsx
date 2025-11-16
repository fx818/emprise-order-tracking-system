import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight 
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            // Prevent Paragraphs inside notes
            class: "no-paragraph",
          },
        },
      }),
      ListItem.extend({
        addKeyboardShortcuts() {
          return {
            Enter: () => {
              if (this.editor.isActive("listItem")) {
                return this.editor.commands.splitListItem("listItem");
              }
              return false;
            },
          };
        },
      }),
      Underline,
      Link,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();

        onChange(html);
    },
  });

  if (!editor) return null;

  return (
    <div className="space-y-2 border rounded-md p-2">

      {/* Toolbar */}
      <ToggleGroup type="multiple" className="flex gap-1 flex-wrap">

        <ToggleGroupItem value="bold" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </ToggleGroupItem>

        <ToggleGroupItem value="italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </ToggleGroupItem>

        <ToggleGroupItem value="underline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </ToggleGroupItem>

        <ToggleGroupItem value="bullet" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </ToggleGroupItem>

        <ToggleGroupItem value="ordered" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </ToggleGroupItem>

        <ToggleGroupItem value="left" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="w-4 h-4" />
        </ToggleGroupItem>

        <ToggleGroupItem value="center" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="w-4 h-4" />
        </ToggleGroupItem>

        <ToggleGroupItem value="right" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="w-4 h-4" />
        </ToggleGroupItem>

      </ToggleGroup>

      <EditorContent editor={editor} className="border rounded-md min-h-[200px] p-3 prose max-w-none" />
    </div>
  );
}
