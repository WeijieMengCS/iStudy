"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require("@angular/core");
var index_1 = require("../_services/index");
var MyProfileComponent = (function () {
    function MyProfileComponent(alertService, profileService, friendService) {
        this.alertService = alertService;
        this.profileService = profileService;
        this.friendService = friendService;
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.myProfile = {
            "extra": {
                "language": [],
                "hobby": []
            },
            "profile": {
                "major": "Unknown",
                "birthday": "",
                "nationality": "Unknown",
                "gender": "Unknown",
                "visibility": true,
            }
        };
    }
    MyProfileComponent.prototype.ngOnInit = function () {
        this.fetchProfile();
        this.fetchFriendList();
    };
    MyProfileComponent.prototype.fetchProfile = function () {
        var _this = this;
        this.profileService.getProfile(this.currentUser.userName)
            .subscribe(function (data) {
            _this.myProfile = data;
            // console.log(this.myProfile.profile.major);
        }, function (error) {
            _this.alertService.error(error);
        });
    };
    MyProfileComponent.prototype.fetchFriendList = function () {
        var _this = this;
        this.friendService.getFriends(this.currentUser.userName).subscribe(function (data) {
            _this.friendList = data;
        });
    };
    return MyProfileComponent;
}());
MyProfileComponent = __decorate([
    core_1.Component({
        moduleId: module.id,
        templateUrl: 'myprofile.component.html'
    }),
    __metadata("design:paramtypes", [index_1.AlertService,
        index_1.ProfileService,
        index_1.FriendService])
], MyProfileComponent);
exports.MyProfileComponent = MyProfileComponent;
//# sourceMappingURL=myprofile.component.js.map