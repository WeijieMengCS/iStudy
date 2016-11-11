'use strict';
var Sequelize = require('sequelize');
var mysql = require('mysql');
var bcrypt = require('bcrypt');

var env = process.env.NODE_ENV || 'development';
var db = {};
var sequelize;

// set debug as 1 to init db every time server restarts otherwise set debug as 0
var debug = 1;

/*****************************************************
 * 				Connect to DB
 *****************************************************/

if (env == 'production') {
    // for heroku
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql'
    });
} else {
    // for local
    var config = require('../config/cnf').database;
    sequelize = new Sequelize(config.database, config.uname, config.pwd, config.options);
}

/*****************************************************
 * 				Config Tables
 *****************************************************/
db.user = sequelize.import(__dirname + '/models/User');
db.professor = sequelize.import(__dirname + '/models/Professor');
db.course = sequelize.import(__dirname + '/models/Course');
db.profile = sequelize.import(__dirname + '/models/Profile');
db.language = sequelize.import(__dirname + '/models/Language');
db.hobby = sequelize.import(__dirname + '/models/Hobby');
db.comment = sequelize.import(__dirname + '/models/Comment');

// a course is defined by a course id and professor id
db.course_professor = sequelize.import(__dirname + '/models/CourseProfessor');
// a friend request is defined by user_id of a sender and a receiver
db.friend_request = sequelize.import(__dirname + '/models/FriendRequest');

/*****************************************************
 * 				Config Relationships
 *****************************************************/

// one user has only one profile
db.user.hasOne(db.profile);
db.profile.belongsTo(db.user);

// one course_profess has many comments
db.course_professor.belongsToMany(db.comment,{through: 'course_comment'});

// one user can speak many languages and one language can be spoken by many users
db.profile.belongsToMany(db.language, {through: 'profile_language'});
db.language.belongsToMany(db.profile, {through: 'profile_language'});

//one user can have many hobbies and one hobby can belong to many users;
db.profile.belongsToMany(db.hobby, {through: 'profile_hobby'});
db.hobby.belongsToMany(db.profile, {through: 'profile_hobby'});

// one prof can teach different courses, one course can be taught by different prof
db.course.belongsToMany(db.professor, {through: db.course_professor});
db.professor.belongsToMany(db.course, {through: db.course_professor});

// one student can join different courses, one course can have different students
db.user.belongsToMany(db.course_professor, {as: 'courses', through: 'course_student'});
db.course_professor.belongsToMany(db.user, {as: 'students', through: 'course_student'});

// one user can have many friends
db.user.belongsToMany(db.user, {as: 'friends', through: 'user_friends'});

// one request can have only one receiver and one sender
db.friend_request.belongsTo(db.user, {as: 'receiver'});
db.friend_request.belongsTo(db.user, {as: 'sender'});


// test config relationship
console.log('User associations: ', Object.keys(db.user.associations));
console.log('Profile associations: ', Object.keys(db.profile.associations));
console.log('Language associations: ', Object.keys(db.language.associations));
console.log('Hobby associations: ', Object.keys(db.hobby.associations));
console.log('Course associations: ', Object.keys(db.course.associations));
console.log('Professor associations: ', Object.keys(db.professor.associations));
console.log('Course_Professor associations:', Object.keys(db.course_professor.associations));
console.log('Friend_Request associations:', Object.keys(db.friend_request.associations));
console.log('Comment associations:', Object.keys(db.comment.associations));

db.sequelize = sequelize;

/*****************************************************
 * 			Create Tables All At Once
 *****************************************************/
// init all the tables
if (debug){
    db.sequelize
        .query('SET FOREIGN_KEY_CHECKS = 0', {raw: true})
        .then(function(results) {
            db.sequelize.sync({force: true});
        });
    // db.sequelize.sync({force: true}).then();
}
else {
    db.sequelize.sync().then();
}


module.exports = db;
