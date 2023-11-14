export function callCC<T>(callback: (exit: (result: T) => void) => T): T {
  const callCCBox = Symbol()
  try {
    return callback((result: T) => {
      throw { callCCBox, result }
    })
  } catch (e) {
    const errBox = e as { callCCBox?: symbol, result?: T }
    if (errBox?.callCCBox == callCCBox) {
      return errBox!.result!
    }
    throw e
  }
}
