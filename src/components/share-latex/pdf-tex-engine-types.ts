/********************************************************************************
 * Copyright (C) 2019 Elliott Wen.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse  License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 *  License v. 2.0 are satisfied: GNU General  License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/


export enum EngineStatus {
  Init = 1,
  Ready,
  Busy,
  Error
}

export class CompileResult {
  pdf: Uint8Array | undefined = undefined
  status: number = -254
  log: string = 'No log'
}

export interface PdfTeXEngine {
  latexWorkerStatus: EngineStatus

  loadEngine(): Promise<void>

  isReady(): boolean

  compileLaTeX(): Promise<CompileResult>

  /* Internal Use */
  compileFormat(): Promise<void>

  setEngineMainFile(filename: string): void

  writeMemFSFile(filename: string, srccode: string | Uint8Array): void

  makeMemFSFolder(folder: string): void

  flushCache(): void

  setTexliveEndpoint(url: string): void

  closeWorker(): void
}
