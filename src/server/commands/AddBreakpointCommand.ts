
import {Command, AbstractCommand, CommandCallback} from "./../command/Command";
import {ExecutionContext} from "./../command/ExecutionContext";
import {ISourceLocation} from "../../common/Debugger";

@Command({
    name: 'addBreakpoint'
})
export class AddBreakpointCommand extends AbstractCommand<ISourceLocation> {

    execute(location:ISourceLocation, executionContext:ExecutionContext, callback:CommandCallback) {

        executionContext.socketSession.mipsSession.addBreakpoint(location.locationString, (err, breakpoint) => {
            if(err) {
                return callback(err);
            }
            callback(null, {
                location: location.locationString,
                pending: breakpoint.pending !== undefined,
                id: breakpoint.id
            });
        });
    }

    public canUse(payload:any):payload is ISourceLocation {
        return typeof payload.filename == 'string'
            && typeof payload.line == 'number'
            && typeof payload.locationString == 'string'
    }
}
