"use client";

import "@mdxeditor/editor/style.css";

import { useCallback, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  InsertCodeBlock,
  ListsToggle,
  BlockTypeSelect,
  Separator,
  DiffSourceToggleWrapper,
} from "@mdxeditor/editor";

import { BACKEND_URL } from "@/lib/backend-url";
import { cn } from "@/lib/utils";

import { MediaPicker } from "./media-picker";

export type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
};

export default function MarkdownEditor({
  value,
  onChange,
  className,
  placeholder,
}: MarkdownEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const imageUploadHandler = useCallback(async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Upload failed (${res.status})`);
    }
    const data = (await res.json()) as { url: string };
    return data.url;
  }, []);

  return (
    <>
      <MDXEditor
        ref={editorRef}
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn("mdx-editor border border-(--line) bg-background", className)}
        contentEditableClassName="prose prose-sm prose-zinc dark:prose-invert max-w-none min-h-[360px] px-4 py-4 focus:outline-none"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin({
            imageUploadHandler,
            imageAutocompleteSuggestions: [],
            disableImageResize: false,
          }),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              ts: "TypeScript",
              tsx: "TSX",
              js: "JavaScript",
              jsx: "JSX",
              json: "JSON",
              bash: "Bash",
              sh: "Shell",
              css: "CSS",
              html: "HTML",
              md: "Markdown",
              sql: "SQL",
              py: "Python",
              go: "Go",
              rust: "Rust",
              "": "Plain",
            },
          }),
          markdownShortcutPlugin(),
          diffSourcePlugin({ diffMarkdown: value, viewMode: "rich-text" }),
          toolbarPlugin({
            toolbarClassName: "mdx-toolbar",
            toolbarContents: () => (
              <DiffSourceToggleWrapper options={["rich-text", "source"]}>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  title="Insert image from library"
                  className="mdx-tool-btn inline-flex items-center justify-center"
                >
                  <ImageIcon className="size-4" />
                </button>
                <InsertImage />
                <InsertTable />
                <InsertThematicBreak />
                <Separator />
                <InsertCodeBlock />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
      />

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => {
          if (url) editorRef.current?.insertMarkdown(`![](${url})`);
        }}
      />
    </>
  );
}
