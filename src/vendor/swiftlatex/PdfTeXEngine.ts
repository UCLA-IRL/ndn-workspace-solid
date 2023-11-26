/********************************************************************************
 * Copyright (C) 2019 Elliott Wen.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
// This is a modified version.

export enum EngineStatus {
  Init = 1,
  Ready,
  Busy,
  Error
}

export class CompileResult {
  pdf: Uint8Array | undefined = undefined;
  status: number = -254;
  log: string = 'No log';
}

type CommandString = 'compile' | 'compilelatex' | 'compileformat' | "settexliveurl" | "mkdir" |
  "writefile" | "setmainfile" | "grace" | "flushcache";

type MsgType = {
  result: string;
  cmd?: CommandString;
  log?: string;
  status?: number;
  pdf?: ArrayBuffer;
}

export class PdfTeXEngine {
  private latexWorker: Worker | undefined = undefined;
  public latexWorkerStatus: EngineStatus = EngineStatus.Init;
  constructor() { }

  public async loadEngine(enginePath: string) {
    if (this.latexWorker !== undefined) {
      throw new Error('Other instance is running, abort()');
    }
    this.latexWorkerStatus = EngineStatus.Init;
    await new Promise<void>((resolve, reject) => {
      this.latexWorker = new Worker(enginePath);
      this.latexWorker.onmessage = (ev: MessageEvent<MsgType>) => {
        if (ev.data.result === 'ok') {
          this.latexWorkerStatus = EngineStatus.Ready;
          resolve();
        } else {
          this.latexWorkerStatus = EngineStatus.Error;
          reject();
        }
      };
    });
    this.latexWorker!.onmessage = () => { };
    this.latexWorker!.onerror = () => { };
  }

  public isReady() {
    return this.latexWorkerStatus === EngineStatus.Ready;
  }

  private checkEngineStatus() {
    if (!this.isReady()) {
      throw Error('Engine is still spinning or not ready yet!');
    }
  }

  public async compileLaTeX() {
    this.checkEngineStatus();
    this.latexWorkerStatus = EngineStatus.Busy;
    const start_compile_time = performance.now();
    const res: CompileResult = await new Promise(resolve => {
      this.latexWorker!.onmessage = (ev: MessageEvent<MsgType>) => {
        if (ev.data.cmd !== "compile") return;
        this.latexWorkerStatus = EngineStatus.Ready;
        console.log('Engine compilation finish ' + (performance.now() - start_compile_time));
        const nice_report = new CompileResult();
        nice_report.status = ev.data.status!;
        nice_report.log = ev.data.log ?? '';
        if (ev.data.result === 'ok') {
          const pdf: Uint8Array = new Uint8Array(ev.data.pdf!);
          nice_report.pdf = pdf;
        }
        resolve(nice_report);
      };
      this.latexWorker!.postMessage({ 'cmd': 'compilelatex' });
      console.log('Engine compilation start');
    });
    this.latexWorker!.onmessage = () => { };

    return res;
  }

  /* Internal Use */
  public async compileFormat() {
    this.checkEngineStatus();
    this.latexWorkerStatus = EngineStatus.Busy;
    await new Promise<void>((resolve, reject) => {
      this.latexWorker!.onmessage = (ev: MessageEvent<MsgType>) => {
        if (ev.data.cmd !== "compile") return;
        // const status: number = data['status'] as number;
        this.latexWorkerStatus = EngineStatus.Ready;
        if (ev.data.result === 'ok') {
          const formatArray = ev.data.pdf!; /* PDF for result */
          const formatBlob = new Blob([formatArray], { type: 'application/octet-stream' });
          const formatURL = URL.createObjectURL(formatBlob);
          setTimeout(() => { URL.revokeObjectURL(formatURL); }, 30000);
          console.log('Download format file via ' + formatURL);
          resolve();
        } else {
          reject(ev.data.log);
        }
      };
      this.latexWorker!.postMessage({ 'cmd': 'compileformat' });
    });
    this.latexWorker!.onmessage = () => { };
  }

  public setEngineMainFile(filename: string) {
    this.checkEngineStatus();
    if (this.latexWorker !== undefined) {
      this.latexWorker.postMessage({ 'cmd': 'setmainfile', 'url': filename });
    }
  }

  public writeMemFSFile(filename: string, srccode: string | Uint8Array) {
    this.checkEngineStatus();
    if (this.latexWorker !== undefined) {
      this.latexWorker.postMessage({ 'cmd': 'writefile', 'url': filename, 'src': srccode });
    }
  }

  public makeMemFSFolder(folder: string) {
    this.checkEngineStatus();
    if (this.latexWorker !== undefined) {
      if (folder === '' || folder === '/') {
        return;
      }
      this.latexWorker.postMessage({ 'cmd': 'mkdir', 'url': folder });
    }
  }

  public flushCache() {
    this.checkEngineStatus();
    if (this.latexWorker !== undefined) {
      // console.warn('Flushing');
      this.latexWorker.postMessage({ 'cmd': 'flushcache' });
    }

  }

  public setTexliveEndpoint(url: string) {
    if (this.latexWorker !== undefined) {
      this.latexWorker.postMessage({ 'cmd': 'settexliveurl', 'url': url });
    }
  }

  public closeWorker() {
    if (this.latexWorker !== undefined) {
      this.latexWorker.postMessage({ 'cmd': 'grace' });
      this.latexWorker = undefined;
    }
  }
}