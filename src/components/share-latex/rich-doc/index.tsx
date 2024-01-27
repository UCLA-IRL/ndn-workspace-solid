import { createTiptapEditor } from 'solid-tiptap'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import Highlight from '@tiptap/extension-highlight'
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import * as Y from 'yjs'
import { createSignal } from 'solid-js'
import { Card, CardContent, Divider, IconButton, Stack } from '@suid/material'
import {
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  StrikethroughS as StrikethroughSIcon,
  Code as CodeIcon,
  Highlight as HighlightIcon,
  Notes as NotesIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatListNumbered as FormatListNumberedIcon,
  DataObject as DataObjectIcon,
  FormatQuote as FormatQuoteIcon,
  HorizontalRule as HorizontalRuleIcon,
  InsertPageBreak as HardBreakIcon,
  FormatClear as FormatClearIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@suid/icons-material'
import { H1Icon, H2Icon, H3Icon, H4Icon } from './icons'
import CmdIcon from './cmd-icon'
import ColorList from './color-list'
import styles from './styles.module.css'

export default function RichDoc(props: { doc: Y.XmlFragment }) {
  const [container, setContainer] = createSignal<HTMLDivElement>()

  const editor = createTiptapEditor(() => ({
    element: container()!,
    extensions: [
      StarterKit.configure({
        // The Collaboration extension comes with its own history handling
        history: false,
      }),
      Collaboration.configure({
        fragment: props.doc,
      }),
      Highlight,
      TextStyle,
      Color,
    ],
  }))

  // TODO: Should use ToggleButton for better appearance. Or at least some CSS.
  return (
    <Card sx={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <CardContent
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid #ddd',
          background: 'inherit',
        }}
      >
        <Stack
          spacing={0}
          direction="row"
          justifyContent="flex-start"
          alignItems="flex-start"
          sx={{ flexWrap: 'wrap' }}
        >
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.toggleBold()} activeName="bold">
            <FormatBoldIcon />
          </CmdIcon>
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.toggleItalic()} activeName="italic">
            <FormatItalicIcon />
          </CmdIcon>
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.toggleStrike()} activeName="strike">
            <StrikethroughSIcon />
          </CmdIcon>
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.toggleCode()} activeName="code">
            <CodeIcon />
          </CmdIcon>
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.toggleHighlight()} activeName="highlight">
            <HighlightIcon />
          </CmdIcon>
          <Divider orientation="vertical" flexItem />
          <CmdIcon
            editor={editor()}
            toggle={(cmd) => cmd?.toggleHeading({ level: 1 })}
            activeName="heading"
            activeAttr={{ level: 1 }}
            noChecking
          >
            <H1Icon />
          </CmdIcon>
          <CmdIcon
            editor={editor()}
            toggle={(cmd) => cmd?.toggleHeading({ level: 2 })}
            activeName="heading"
            activeAttr={{ level: 2 }}
            noChecking
          >
            <H2Icon />
          </CmdIcon>
          <CmdIcon
            editor={editor()}
            toggle={(cmd) => cmd?.toggleHeading({ level: 3 })}
            activeName="heading"
            activeAttr={{ level: 3 }}
            noChecking
          >
            <H3Icon />
          </CmdIcon>
          <CmdIcon
            editor={editor()}
            toggle={(cmd) => cmd?.toggleHeading({ level: 4 })}
            activeName="heading"
            activeAttr={{ level: 4 }}
            noChecking
          >
            <H4Icon />
          </CmdIcon>
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.setParagraph()} activeName="paragraph" noChecking>
            <NotesIcon />
          </CmdIcon>
          <Divider orientation="vertical" flexItem />
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.toggleBulletList()} activeName="bulletList">
            <FormatListBulletedIcon />
          </CmdIcon>
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.toggleOrderedList()} activeName="orderedList">
            <FormatListNumberedIcon />
          </CmdIcon>
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.toggleCodeBlock()} activeName="codeBlock">
            <DataObjectIcon />
          </CmdIcon>
          <ColorList editor={editor()} />
          <Divider orientation="vertical" flexItem />
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.toggleBlockquote()} activeName="blockquote">
            <FormatQuoteIcon />
          </CmdIcon>
          <IconButton onClick={() => editor()?.chain().focus().setHorizontalRule().run()}>
            <HorizontalRuleIcon />
          </IconButton>
          <Divider orientation="vertical" flexItem />
          <IconButton onClick={() => editor()?.chain().focus().setHardBreak().run()}>
            <HardBreakIcon />
          </IconButton>
          <IconButton onClick={() => editor()?.chain().focus().unsetAllMarks().run()}>
            <FormatClearIcon />
          </IconButton>
          <Divider orientation="vertical" flexItem />
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.undo()}>
            <UndoIcon />
          </CmdIcon>
          <CmdIcon editor={editor()} toggle={(cmd) => cmd?.redo()}>
            <RedoIcon />
          </CmdIcon>
        </Stack>
      </CardContent>
      <Divider />
      <CardContent>
        <div id="editor" class={styles.editor} ref={setContainer} />
      </CardContent>
    </Card>
  )
}
