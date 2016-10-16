/// <reference path="../../typings/jquery/jquery.d.ts" />

import { Component, OnInit, ElementRef } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { UserService } from '../_services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'dashboard.component.html',
    styleUrls: [
        '/feature\ content/assets/js/morris/morris-0.4.3.min.css',
        '/feature\ content/assets/css/custom-styles.css'
    ]
})

export class DashboardComponent implements OnInit {
    currentUser: any = {};

    constructor(
        private userService: UserService,
        private elementRef: ElementRef
    ) {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    }


    ngOnInit(){
        //called after the constructor and called  after the first ngOnChanges()
    }

    ngAfterViewInit() {
        this.loadScript("/feature content/assets/js/jquery-1.10.2.js");
        this.loadScript("/feature content/assets/js/bootstrap.min.js");
        this.loadScript("/feature content/assets/js/jquery.metisMenu.js");
        this.loadScript("/feature content/assets/js/morris/raphael-2.1.0.min.js");
        this.loadScript("/feature content/assets/js/morris/morris.js");
        this.loadScript("/feature content/assets/js/custom-scripts.js");
    }

    loadScript(url: string) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        this.elementRef.nativeElement.appendChild(script);
    }
}