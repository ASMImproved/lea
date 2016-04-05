
import {ICommand} from "./command/ICommand";
import {MemoryFrame} from "../common/MemoryFrame";
import {ExecutionContext} from "./command/ExecutionContext";

export class ChangeMemoryFrameCommand implements ICommand{

    execute(payload: MemoryFrame, executionContext: ExecutionContext, callback:any) {
        executionContext.socketSession.memoryFrame = payload;
        if(executionContext.socketSession.mipsSession) {
            try {
                let debug = executionContext.socketSession.mipsSession.mipsProgram.debug;
                debug.readMemory("0x" + payload.start.toString(16), 10000)
                .then((blocks: dbgmits.IMemoryBlock[]) => {
                    callback(null, {}, [blocks]);
                }, (err) => {
                    console.log('read mem failed', err);
                    callback(null, {
                        memoryReadFailed: true
                    }, []);
                });
            } catch(e) {
                callback(e);
            }
        } else {
            callback(null, {}, []);
        }
    }
}