const EditorTheme = {
  '&': {
    whiteSpace: "nowrap",
    textAlign: "left",
    height: "100%",
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    fontFamily: '"Roboto Mono", ui-monospace, monospace',
    fontSize: '15px',
  },
  '.cm-gutters': {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    backgroundColor: 'var(--md-sys-color-background)',
    color: 'var(--md-sys-color-on-background)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--md-sys-color-shadow)',
    color: 'var(--md-sys-color-on-primary)',
  },
  '.ͼc': {  // Tokens {HERE}
    color: 'var(--md-sys-color-secondary)',
  },
  '.ͼi': {  // Commands  \HERE
    color: 'var(--theme-color-success)',
  },
  '.ͼm': {  // Comments  %HERE
    color: 'var(--theme-color-grey-600)',
  },
  '.ͼn': {  // Error
    color: 'var(--md-sys-color-error)',
  },
  '.ͼb': {  // Math dollor  $ <- THIS
    color: 'var(--md-sys-color-secondary)',
  },
  '.ͼk': {  // Symbols in math mode  $HERE$
    color: 'var(--md-sys-color-primary)',
  },
  '.ͼd': {  // Numbers in math mode  %HERE
    color: 'var(--theme-color-success)',
  },
}

export default EditorTheme
