// Type definitions for metisMenu 2.0.3
// Project: http://github.com/onokumus/metisMenu
// Definitions by: onokums <https://github.com/onokumus/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference path="../globals/jquery/index.d.ts"/>

interface MetisMenuOptions {
    toggle?: boolean;
    doubleTapToGo?: boolean;
    activeClass?: string;
    collapseClass?: string;
    collapseInClass?: string;
    collapsingClass?: string;
}

interface JQuery {
    metisMenu(options?: MetisMenuOptions): JQuery;
}
