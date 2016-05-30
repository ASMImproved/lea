/// <reference path="../../../typings/index.d.ts" />

import {AbstractCommand, Command, CommandCallback} from "./../command/Command";
import {MipsSession, MipsSessionState} from "./../arch/mips/MipsSession";
import {ExecutionContext} from "./../command/ExecutionContext";
import {AnswerContext} from "../../common/AnswerContext";
import {basename} from "path";
import {SourceLocation, Registers} from "../../common/Debugger";
import * as dbgmits from "asmimproved-dbgmits";
import {Project} from "../../common/Project";
import {File} from "../../common/File"

interface RunPayload {
    project:Project
}

@Command({
    name: 'run'
})
export class RunCommand extends AbstractCommand<RunPayload> {
    private executionContext: ExecutionContext;

    execute(payload:RunPayload, executionContext: ExecutionContext, callback: CommandCallback) {
        this.executionContext = executionContext;
        if(executionContext.socketSession.mipsSession) {
            if(executionContext.socketSession.mipsSession.state != MipsSessionState.Terminated && executionContext.socketSession.mipsSession.state != MipsSessionState.Error) {
                return callback(new Error("Session is already running"));
            } else {
                executionContext.socketSession.mipsSession.dispose();
                delete executionContext.socketSession.mipsSession;
            }
        }
        let files = payload.project.files.filter((file: File) => {
            var chunks: Array<string>  = file.name.split('.');
            let fileNameEnding;
            if(chunks.length === 1) {
                return false;
            } else {
                fileNameEnding = chunks[chunks.length - 1];
            }
            return fileNameEnding === "s" || fileNameEnding === "h" || fileNameEnding === "c";
        });
        if(files.length == 0) {
            return callback(new Error("Project contains no files which can be consumed by gcc"));
        }
        let mips = executionContext.socketSession.mipsSession = new MipsSession(payload.project);
        mips.run((err) => {
            if(err) {
                return callback(err);
            }
            mips.debuggerStartedPromise.then(() => {
                console.log('bug started promise resolved');
                mips.readMemory(executionContext.socketSession.memoryFrame, (err, blocks) => {
                    if(err) {
                        return callback(err);
                    }
                    callback(null, {
                        ok: true
                    }, [new AnswerContext("memoryUpdate", blocks)]);
                });
            }, (err) => {
                console.error('bug started promise rejected', err);
                return callback(err);
            });
        });
        mips.on('stdout', (chunk) => {
            console.log(chunk);
            executionContext.socketSession.emit('stdout', chunk, []);
        });
        mips.on('hitBreakpoint', (stoppedEvent: dbgmits.IBreakpointHitEvent) => {
            this.sendHitBreakpointEvent(new SourceLocation(basename(stoppedEvent.frame.filename), stoppedEvent.frame.line), stoppedEvent.breakpointId);
        });
        mips.on('hitWatchpoint', (watchpointEvent: dbgmits.IWatchpointTriggeredEvent) => {
            this.sendWatchpointTriggeredEvent(new SourceLocation(basename(watchpointEvent.frame.filename), watchpointEvent.frame.line), watchpointEvent.watchpointId);
        });
        mips.on('programContinued', () => {
            this.executionContext.socketSession.emit("programContinued", {}, []);
        });
        mips.on('receivedSignal', (signal: dbgmits.ISignalReceivedEvent) => {
            this.sendReceivedSignalEvent(signal);
        });
        mips.on('exit', (code: number, signal: string) => {
            this.sendExitEvent(code, signal);
        });
    }

    private sendWatchpointTriggeredEvent(location: SourceLocation, watchpointId:number) {
        this.emitEventWithMachineState('hitWatchpoint', {
            watchpointId,
            location
        });
    }

    private sendHitBreakpointEvent(location: SourceLocation, breakpointId?: any) {
        this.emitEventWithMachineState('hitBreakpoint', {
            location: location,
            breakpointId: breakpointId
        });
    }
    
    private sendReceivedSignalEvent(signal: dbgmits.ISignalReceivedEvent) {
        this.executionContext.socketSession.mipsSession.getStackFrame((err, stackFrame: dbgmits.IStackFrameInfo)=> {
            if(err) {
                console.error(err);
            }
            console.log(stackFrame);
            this.emitEventWithMachineState('receivedSignal', {
                signalName: signal.signalName,
                signalMeaning: signal.signalMeaning,
                location: stackFrame ?  (stackFrame.filename && stackFrame.line ? new SourceLocation(basename(stackFrame.filename), stackFrame.line) : undefined) : undefined
            });
        });
    }

    private emitEventWithMachineState(signalName:string, payload:any) {
        this.executionContext.socketSession.mipsSession.getMachineState(this.executionContext.socketSession.memoryFrame, (err, memoryBlocks?:dbgmits.IMemoryBlock[], registers?:Registers) => {
            let context = [];
            if (err) {
                console.error(err);
            } else {
                context.push(new AnswerContext("memoryUpdate", memoryBlocks));
                context.push(new AnswerContext("registerUpdate", registers));
            }

            this.executionContext.socketSession.emit(signalName, payload, context);
        });
    }

    private sendExitEvent(code, signal) {
        this.executionContext.socketSession.mipsSession.readMemory(this.executionContext.socketSession.memoryFrame, (err, memoryBlocks?: dbgmits.IMemoryBlock[]) => {
            if(err) {
                console.error(err);
                return this.executionContext.socketSession.emit('exit', {
                    code: code,
                    signal: signal
                }, []);
            }
            this.executionContext.socketSession.emit('exit', {
                code: code,
                signal: signal
            }, [new AnswerContext("memoryUpdate", memoryBlocks)]);
        });
    }

    public canUse(payload:any):payload is RunPayload {
        return typeof payload.project !== 'undefined'
            && payload.project.files instanceof Array
            && typeof payload.project.name == 'string';
    }
}
