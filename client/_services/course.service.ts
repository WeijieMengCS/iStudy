import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/map';

import { Class } from '../_models/index';

@Injectable()
export class CourseService {
    private apiUrl = 'http://api.purdue.io/odata';
    private termId = 'c543a529-fed4-4fd0-b185-bd403106b4ea';
    constructor(private http: Http) {
    }

    getAllMajors() {
        var filterUrl = '/Subjects/?$filter=(Courses/any(c:%20c/Classes/any(cc:%20cc/Term/TermId%20eq%20';
        var abbrOrder = ')))&$orderby=Abbreviation%20asc';
        var detailedUrl = this.apiUrl + filterUrl + this.termId + abbrOrder;
        return this.http.get(detailedUrl).map((res: Response) => res.json());
    }

    getMajorCourses(majorId: string) {
        // todo: need to change later
        var filterUrl = '/Courses/?$filter=(Classes/any(c:%20c/Term/TermId%20eq%20';
        var major = '))%20and%20Subject/SubjectId%20eq%20' + majorId;
        var order = '&$orderby=Number%20asc';
        var detailedUrl = this.apiUrl + filterUrl + this.termId + major + order;
        return this.http.get(detailedUrl).map((res: Response) => res.json());
    }

    getCoursesDetails(courseId: string) {
        var filterUrl = '/Classes?$filter=Course/CourseId%20eq%20';
        var midUrl = '%20and%20Term/TermId%20eq%20';
        var expand = '&$expand=Term,Sections($expand=Meetings($expand=Instructors,Room($expand=Building)))';
        var detailedUrl = this.apiUrl + filterUrl + courseId + midUrl + this.termId + expand;
        return this.http.get(detailedUrl).map((res: Response) => res.json());
    }

}