import {Component, Input, Output} from '@angular/core';
import {BehaviorSubject} from 'rxjs/Rx';

@Component({
    selector: 'editable',
    template: `
    <input *ngIf="editing" type="text" [(ngModel)]="text" (blur)="editing=false"/>
    <span *ngIf="!editing">{{text}}</span>
    <i class="fa fa-pencil" (click)="editing=true" *ngIf="!editing"></i>
`,
})
export class EditableComponent{
    private editing = false;

    private _text = new BehaviorSubject<string>(null);
    @Output() textChange = this._text.asObservable();

    public get text() {     
        return this._text.getValue();
    }

    @Input() public set text(text: string) {
        this._text.next(text);
    }

}
