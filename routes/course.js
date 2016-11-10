'use strict';
var express = require('express');
var router = express.Router();
var db = require(__dirname + '/../db.js');
var middleware = require(__dirname + '/../middleware.js')(db);
var _ = require('underscore');
var Promise = require('bluebird');

/******************************************************
 *  GET all course names along with their descriptions
 ******************************************************/
router.get('/', middleware.requireAuthentication,  function(req, res){
	db.course.findAll({attributes: ['name', 'description']}).then(function (courses) {
		if (courses){
			res.status(200).json(courses);
		}
		else {
			res.status(404).send({err: "fail to get courses"});
		}

	}, function(error){
		res.status(400).send({err: error});
	});
});

/**************************************************
 * 			Get Relevant Professors
 **************************************************/
router.post('/', middleware.requireAuthentication, function(req, res){
	/**
	 * JSON Format:
	 * {
	 * 	"course": "..."
	 * }
	 */
	var body = _.pick(req.body, 'course');
	db.course.findOne({where: {"name": body.course}}).then(function(course){
		if (course){
			// found and send user relevant professors
			course.getProfessors().then(function(professors){
				res.status(200).json(professors);
			});
		}
		else {
			res.status(404).send({err: "Course Not Found :("});
		}
	}, function (err) {
		res.status(400).send(err);
	});
});

/**************************************************
 * 				Join A Class
 **************************************************/
router.post('/join', middleware.requireAuthentication, function (req, res) {
	/**
	 * JSON Format:
	 * {
	 * 	"course": "...",
	 * 	"professor": "...",
	 * 	"userName": "..."
	 * }
	 */
	var body = _.pick(req.body, 'course', 'professor', 'userName');
	db.course.findOne({where: {name: body.course}}).then(function (course) {
		if (course){
			//TODO: two prof with same name might cause problem
			// *Note: course name set to be unique
			db.professor.findOne({where: {name: body.professor}}).then(function (professor) {
				if (professor){
					db.course_professor.findOne({where: {course_id: course.id, professor_id: professor.id}})
						.then(function (c_u) {
							if (c_u){
								// first find the actual course the student wants to join
								db.user.findOne({where: {userName: body.userName}}).then(function (user) {
									if (user){
										// add user as a student to the course
										user.addCourse(c_u);
										console.log('user ', body.userName, ' has joined the class ', body.course, ' by ', body.professor);
										res.status(200).send({res: "Join the class successfully"});
									}
									else {
										res.status(400).send({err: "No such user :("});
									}
								});
							}else{
								res.status(400).send({err: "No such course :("});
							}
						});
				}
				else {
					res.status(400).send({err: "Professor Not Found :("});
				}
			});
		}
		else{
			res.status(400).send({err: "Course Not Found :("});
		}
	});
});



/**************************************************
 * 			Get All Students
 **************************************************/
router.post('/students', middleware.requireAuthentication, function (req, res) {
	/**
	 * JSON Format:
	 * {
	 * 	"course": "course name"
	 * 	"professor": "professor name"
	 * }
	 */
	var body = _.pick(req.body, 'course', 'professor');
	db.course.findOne({where: {name: body.course}}).then(function (course) {
		if (course){
			//TODO: two prof with same name might cause problem
			// *Note: course name set to be unique
			db.professor.findOne({where: {name: body.professor}}).then(function (professor) {
				if (professor){
					db.course_professor.findOne({where: {course_id: course.id, professor_id: professor.id}})
						.then(function (c_u) {
							if (c_u){
								// find course by a specific professor
								c_u.getStudents().then(function (students) {
									if (students){
										res.status(200).json(students);
									}
									else {
										res.status(404).send({err: "No stduents joined this course"});
									}
								});
							}
							else {
								res.status(404).send({err: "No such course :("});
							}
						});
				}
				else {
					res.status(404).send({err: "Professor Not Found :("});
				}
			});
		}
		else {
			res.status(404).send({err: "Course Not Found :("});
		}
	});
});


/**************************************************
 * 		Get Number Of Students In One Class
 **************************************************/
router.post('/number-of-students', middleware.requireAuthentication, function (req, res) {
	/**
	 * JSON Format:
	 * {
	 * 	"course": "course name"
	 * 	"professor": "professor name"
	 * }
	 */
	var body = _.pick(req.body, 'course', 'professor');
	db.course.findOne({where: {name: body.course}}).then(function (course) {
		if (course){
			//TODO: two prof with same name might cause problem
			// *Note: course name set to be unique
			db.professor.findOne({where: {name: body.professor}}).then(function (professor) {
				if (professor){
					db.course_professor.findOne({where: {course_id: course.id, professor_id: professor.id}})
						.then(function (c_u) {
							if (c_u){
								// find course by a specific professor
								c_u.getStudents().then(function (students) {
									if (students){
										res.status(200).send({number: students.length});
									}
									else {
										res.status(404).send({err: "No stduents joined this course"});
									}
								});
							}
							else {
								res.status(404).send({err: "No such course :("});
							}
						});
				}
				else {
					res.status(404).send({err: "Professor Not Found :("});
				}
			});
		}
		else {
			res.status(404).send({err: "Course Not Found :("});
		}
	});
});


/**************************************************
 * 			Get User Course List
 **************************************************/
router.post('/get-class-list', middleware.requireAuthentication, function(req, res){
	/**
	 * JSON Format:
	 * {
	 * 	"userName": "..."
	 * 	}
	 */
	var course_ids = [];
	var body = _.pick(req.body, 'userName');
	db.user.findOne({where: {userName: body.userName}}).then(function (user) {
		if (user){
			console.log(user.userName);
			user.getCourses().then(function (c_ids) {
				if (c_ids){
					c_ids.map(function (c_id) {
						course_ids.push(c_id.course_id);
					});

					db.course.findAll({where: {id: {$in: course_ids}}}).then(function (courses) {
						res.status(200).json(courses);
					});
				}
				else {
					res.status(404).send({err: "User Didn't Attend Any Course Yet :("});
				}
			});
		}
		else{
			res.status(404).send({err: "User Not Found :("});
		}
	});
});


/**
 * Function used to retrieve relevant Course Name and Professor Name
 * @param c_ids
 * @param course_list
 */
var retrieveCourseAndProfessors = function (c_ids, course_list) {
	return new Promise(function (resolve, reject) {
		var promises = [];
		c_ids.forEach(function (c_id) {
			promises.push(
				Promise.all([
					db.course_professor.findOne({where: {id: c_id}})
				])
					.spread(function (c_p) {
						console.log(c_p.course_id);
						console.log(c_p.professor_id);
					})
			)
		});
		return Promise.all(promises);
	});
};

module.exports = router;