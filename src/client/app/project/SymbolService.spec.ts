/// <reference path="../../../../typings/globals/jasmine/index.d.ts" />
import {describe, it, expect} from '@angular/core/testing';
import {SymbolService} from "./SymbolService";
import objectContaining = jasmine.objectContaining;

describe("SymbolService", () => {
    var symbolService: SymbolService;
    var projectService: any = {
        projectChanged$: {
             subscribe: (observer: Function) => {}
        }
    };
    var socketService: any = {
        subscribeToContext: (name: string, cb: any) => {}
    };

    beforeEach(() => {
        symbolService = new SymbolService(projectService, socketService);
    });

    it("recognizes a local label", () => {
        symbolService.parse({
            content: "localLabel:",
            name: "testfile.s"
        });
        expect(symbolService.symbols.length).toBe(1);
        expect(symbolService.symbols[0].name).toBe('localLabel');
        expect(symbolService.symbols[0].file.name).toBe('testfile.s');
        expect(symbolService.symbols[0].line).toBe(1);
        expect(symbolService.symbols[0].global).toBe(false);
    });

    it("recognizes a global label", () => {
        symbolService.parse({
            content: ".globl globalLabel\nglobalLabel:",
            name: "testfile.s"
        });
        expect(symbolService.symbols.length).toBe(1);
        expect(symbolService.symbols[0].name).toBe('globalLabel');
        expect(symbolService.symbols[0].file.name).toBe('testfile.s');
        expect(symbolService.symbols[0].line).toBe(2);
        expect(symbolService.symbols[0].global).toBe(true);
    });

});
